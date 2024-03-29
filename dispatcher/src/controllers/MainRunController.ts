import log4js, { getLogger } from "log4js";
import config, { reloadConfig } from "../models/config";
import { ChildProcessWithoutNullStreams, spawnSync } from "child_process";
import docker from "../utils/docker";
import { ArchConfig, ArchRepoInfoEntry } from "../types/ConfigTypes";
import wrapChildProcess from "../utils/wrapChildProcess";
import AurPackageBase from "../models/AurPackageBase";
import { Arch } from "../types/enums";
import BuildStatus from "../models/BuildStatus";
import UpdatedPackage from "../models/UpdatedPackage";
import date from "date-format";
import PackageList from "../models/PackageList";
import ArchRepo from "../models/ArchRepo";
import fsP from "fs/promises";
import fs from "fs";
import path from "path";
import os from "os";
import decompress from "decompress";
import decompressTarxz from "decompress-tarxz";
import parseArchDbPackageInfo from "../utils/parseArchDbPackageInfo";
import checkAndLinkFile from "../utils/checkAndLinkFile";
import sleep from "sleep-promise";

export default class MainRunController {
  private log = log4js.getLogger("Dispatcher");

  private isRunning = false;
  private status: BuildStatus;
  private repos = new PackageList((arch) => new ArchRepo(arch));

  private recordError(...message: string[]) {
    this.status.errors.push(message.join(" "));
    this.log.error(message.shift(), ...message);
  }

  private updateDockerImages() {
    return Promise.all(
      Object.entries(config.builders).map(async ([arch, builder]) => {
        this.log.info("Update docker image for", arch, "builder...");
        try {
          const archCfg: ArchConfig = config.arches[arch];
          let command: ChildProcessWithoutNullStreams;
          switch (builder.type) {
            case "local":
              command = docker.pull({ ...archCfg, ...builder });
              break;
            case "ssh-docker":
              command = docker.pullOverSsh({ ...archCfg, ...builder });
              break;
            default:
              this.log.info("No need for type", builder.type);
              break;
          }
          await wrapChildProcess(command, log4js.getLogger(`UpdateDocker.${arch}`));
          this.log.info("Update docker image for", arch, "builder done");
        } catch (error) {
          this.recordError(`Unable to update docker image for ${arch} builder`);
        }
      })
    );
  }

  private async updateSources() {
    this.log.info("Fetch sources...");
    const promises: Promise<void>[] = [];

    for (const pkgInit of config.pacman) {
      promises.push(
        (async () => {
          const pkg = new AurPackageBase(pkgInit, "x86_64");
          this.log.info("Fetching:", pkg.pkgbase, pkg.arch);
          try {
            await pkg.updateSource();
            this.status.allPackages.x86_64.push(pkg);
          } catch (error) {
            this.log.error(pkg.pkgbase, error);
            this.recordError(`${pkg.pkgbase}-${pkg.arch}: Unable to update source`);
            return;
          }
          let arches = pkg.archesSupported;
          if (arches === "any") {
            arches = Object.keys(config.arches) as Arch[];
          }
          if (typeof pkgInit === "object") {
            for (const archSupported of Object.keys(config.arches) as Arch[]) {
              // 加入配置文件中注明但是包里没注明的架构
              if (pkgInit[archSupported] && !arches.includes(archSupported)) {
                arches.push(archSupported);
              }
            }
          }
          // 包里注明且支持的架构
          for (const arch of arches.filter((it) => it !== "x86_64" && config.arches[it])) {
            if (typeof pkgInit === "object" && pkgInit[arch] === false) continue;
            const pkg = new AurPackageBase(pkgInit, arch);
            this.log.info("Fetching:", pkg.pkgbase, pkg.arch);
            try {
              await pkg.updateSource();
              this.status.allPackages[arch].push(pkg);
            } catch (error) {
              this.log.error(pkg.pkgbase, error);
              this.recordError(`${pkg.pkgbase}-${pkg.arch}: Unable to update source`);
              continue;
            }
          }
        })()
      );
      await sleep(300);
    }

    await Promise.all(promises);
  }

  private calculateUpdatedPackages() {
    this.log.info("Calculating updated packages...");
    for (const arch of Object.keys(config.arches)) {
      const archPakcages = this.status.allPackages[arch] as AurPackageBase[];
      this.status.updatedPackages[arch].push(
        ...archPakcages
          .filter((pkg) => {
            const rebuildNeeded = pkg.rebuildNeeded;
            if (rebuildNeeded) {
              this.log.info("Rebuild needed:", arch, pkg.pkgbase);
            }
            return rebuildNeeded;
          })
          .map((pkg) => new UpdatedPackage(pkg))
      );
    }
  }

  private buildPackages() {
    // 并行构建每个架构的包，因为它们不在同一个机器上
    const promises = Object.keys(config.arches).map(
      (arch) =>
        new Promise<void>(async (resolve) => {
          const packages = this.status.updatedPackages[arch] as UpdatedPackage[];
          for (const pkg of packages) {
            await this.status.saveStatus();
            this.log.info(arch, "builder start building", pkg.pkg.pkgbase);
            pkg.buildDate = new Date();
            try {
              await pkg.pkg.build(
                getLogger(`Build.${pkg.pkg.pkgbase}-${arch}.${date("yyyy-MM-dd.hhmmss", pkg.buildDate)}`)
              );
              pkg.success = true;
            } catch (error) {
              const logPath = path.join(
                config.paths.logs,
                "build",
                `Build.${pkg.pkg.pkgbase}-${arch}.${date("yyyy-MM-dd.hhmmss", pkg.buildDate)}.log`
              );
              this.recordError(`${pkg.pkg.pkgbase}-${arch}: Build failed, log file:`, logPath);
              spawnSync("tail", [logPath], { stdio: "inherit" });
              continue;
            }
            try {
              const repo = this.repos[arch] as ArchRepo;
              this.log.info(arch, "adding", pkg.pkg.pkgbase, "to repo");
              this.log.trace(pkg.pkg.filesWeHave);
              await repo.addPackage(pkg.pkg.filesWeHave);
            } catch (error) {
              this.recordError(`${pkg.pkg.pkgbase}-${arch}: Add to repo failed`);
              this.log.error(error);
              continue;
            }
          }
          resolve();
        })
    );
    return Promise.all(promises);
  }

  private async generateRepoInfo() {
    const linkFilePath = path.join(config.paths.logs, "repoInfo.json");
    const currentFilePath = path.join(
      config.paths.logs,
      `repoInfo.${date("yyyy-MM-dd.hhmmss", this.status.startTime)}.json`
    );
    const repoInfo = new PackageList<ArchRepoInfoEntry[]>(() => []);
    // 先读之前结果
    let lastInfo = new PackageList<ArchRepoInfoEntry[]>(() => []);
    if (fs.existsSync(linkFilePath)) {
      lastInfo = JSON.parse(await fsP.readFile(linkFilePath, "utf-8"));
    }
    // 遍历架构
    for (const arch of Object.keys(repoInfo)) {
      const repo = this.repos[arch] as ArchRepo;
      if (!fs.existsSync(repo.dbPath)) continue;
      // 解包 db
      const extractPath = await fsP.mkdtemp(path.join(os.tmpdir(), "extract-repo-"));
      await decompress(repo.dbPath, extractPath, {
        plugins: [decompressTarxz()],
      });
      // 遍历包
      for (const pkg of await fsP.readdir(extractPath)) {
        const meta = await parseArchDbPackageInfo(path.join(extractPath, pkg));
        // 这次打包状态更新的话就用这次状态，否则就用三次的状态
        const currentStatus = (this.status.updatedPackages[arch] as UpdatedPackage[]).find(
          (it) => it.pkg.pkgbase === meta.base
        );
        (repoInfo[arch] as ArchRepoInfoEntry[]).push({
          meta,
          status: currentStatus
            ? {
                lastBuildAttempt: currentStatus.buildDate,
                lastBuildSuccess: currentStatus.success,
                url: currentStatus.pkg.aurUrl,
              }
            : (lastInfo[arch] as ArchRepoInfoEntry[]).find((it) => it.meta.name === meta.name)?.status,
        });
      }
    }
    await fsP.writeFile(currentFilePath, JSON.stringify(repoInfo), "utf-8");
    await checkAndLinkFile(currentFilePath, linkFilePath);
  }

  public async run() {
    if (this.isRunning) {
      throw new Error("Running");
    }
    this.isRunning = true;
    reloadConfig();
    this.status = new BuildStatus();
    await this.updateDockerImages();
    await this.updateSources();
    this.calculateUpdatedPackages();
    await this.buildPackages();
    this.status.endTime = new Date();
    await this.status.saveStatus();
    await this.generateRepoInfo();
    this.isRunning = false;
    this.log.info`Build finished`;
  }
}
