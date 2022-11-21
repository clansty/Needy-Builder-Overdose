import log4js from "log4js";
import config from "../models/config";
import { ChildProcessWithoutNullStreams } from "child_process";
import docker from "../utils/docker";
import { ArchConfig, PackageInit } from "../types/ConfigTypes";
import wrapChildProcess from "../utils/wrapChildProcess";
import AurPackageBase from "../models/AurPackageBase";
import { Arch } from "../types/enums";
import date from "date-format";
import BuildStatus from "../models/BuildStatus";
import PackageList from "../models/PackageList";

export default class MainRunController {
  private log = log4js.getLogger("Dispatcher");

  private isRunning = false;
  private status: BuildStatus;

  private async updateDockerImages() {
    for (const [arch, builder] of Object.entries(config.builders)) {
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
        this.log.error("Unable to update docker image for", arch, "builder");
      }
    }
  }

  private async updateSources() {
    this.log.info("Fetch sources...");

    for (const pkgInit of config.pacman) {
      const pkg = new AurPackageBase(pkgInit, "x86_64");
      this.log.info("Fetching:", pkg.pkgbase, pkg.arch);
      try {
        await pkg.updateSource();
        this.status.allPackages.x86_64.push(pkg);
      } catch (error) {
        this.log.error(pkg.pkgbase, error);
        continue;
      }
      let arches = pkg.archesSupported;
      if (arches === "any") {
        arches = Object.keys(config.arches) as Arch[];
      }
      if (typeof pkgInit === "object") {
        for (const archSupported of Object.keys(config.arches) as Arch[]) {
          if (pkgInit[archSupported] && !arches.includes(archSupported)) {
            arches.push(archSupported);
          }
        }
      }
      for (const arch of arches.filter((it) => it !== "x86_64" && config.arches[it])) {
        const pkg = new AurPackageBase(pkgInit, arch);
        this.log.info("Fetching:", pkg.pkgbase, pkg.arch);
        try {
          await pkg.updateSource();
          this.status.allPackages[arch].push(pkg);
        } catch (error) {
          this.log.error(pkg.pkgbase, error);
          continue;
        }
      }
    }
  }

  public async run() {
    if (this.isRunning) {
      throw new Error("Running");
    }
    this.isRunning = true;
    this.status = new BuildStatus();
    await this.updateDockerImages();
    await this.updateSources();
    this.log.info(
      "All packages:",
      Object.fromEntries(
        Object.entries(this.status.allPackages).map(([arch, packages]) => [arch, packages.map((it) => it.pkgbase)])
      )
    );
    this.isRunning = false;
  }
}
