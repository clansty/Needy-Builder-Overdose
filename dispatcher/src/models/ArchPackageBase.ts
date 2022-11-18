import { spawnSync, spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { Arch } from "../types/enums";
import config from "./config";
import fs from "fs";
import log4js from "log4js";
import date from "date-format";
import docker from "../utils/docker";
import { DockerRunConfig, SshConfig } from "../types/ConfigTypes";

export default class ArchPackageBase {
  protected readonly log: log4js.Logger;
  public constructor(public readonly pkgbase: string, public readonly arch: Arch) {
    this.log = log4js.getLogger(`Package.${pkgbase}-${arch}`);
  }

  get path() {
    return path.join(config.paths.sources[this.arch], this.pkgbase);
  }

  /**
   * 当前目录被 build 之后能得到的包文件
   */
  get filesToGet() {
    const pkglist = spawnSync("makepkg", ["--packagelist"], {
      cwd: this.path,
      encoding: "utf-8",
      env: {
        CARCH: this.arch,
      },
    });
    if (pkglist.status !== 0) {
      this.log.error("makepkg --packagelist Exit code:", pkglist.status);
      this.log.error(pkglist.stderr);
      throw new Error(pkglist.stderr);
    }

    return pkglist.stdout
      .split("\n")
      .filter((it) => it)
      .map((line) => path.basename(line))
      .map((line) => line.substring(0, line.indexOf(".pkg.tar")));
  }

  /**
   * pkgfiles 中包含的上次 build 结果
   */
  get filesWeHave() {
    try {
      const pkgfiles = fs.readFileSync(path.join(this.path, "pkgfiles"), "utf-8");
      return pkgfiles
        .split("\n")
        .filter((it) => it)
        .map((line) => path.basename(line))
        .map((line) => line.substring(0, line.indexOf(".pkg.tar")));
    } catch {
      return [];
    }
  }

  /**
   * 根据数据库对比是否需要重新构建
   */
  get rebuildNeeded() {
    const pkgbuild = fs.readFileSync(path.join(this.path, "PKGBUILD"), "utf-8");
    if (pkgbuild.includes("pkgver()")) {
      // 应该是个 -git 包
      return true;
    }
    return this.filesToGet.some((file) => !this.filesWeHave.includes(file));
  }

  public build() {
    return new Promise<void>((resolve, reject) => {
      // 这里面应该都是 ssh 执行的命令
      const log = log4js.getLogger(`Build.${this.pkgbase}-${this.arch}.${date("yyyy-MM-dd.hhmmss")}`);
      log.mark("Start building");
      let builder: ChildProcessWithoutNullStreams;
      const builderConfig = config.builders[this.arch];
      const dockerConfig = {
        volumes: {
          "/work": this.path,
          "/scripts": `${config.paths.program}/builder/scripts`,
        },
        rm: true,
        command: ["sudo", "-u", "builder", "/scripts/build.sh"],
        ...builderConfig,
      };

      switch (builderConfig.type) {
        case "local": {
          builder = docker.run(config.dockerImage, dockerConfig);
          break;
        }
        case "ssh-docker": {
          builder = docker.runOverSsh(config.dockerImage, dockerConfig as DockerRunConfig & SshConfig);
          break;
        }
      }
      builder.stdout.on("data", (data) => {
        log.info(data.toString("utf8"));
      });
      builder.stderr.on("data", (data) => {
        log.error(data.toString("utf8"));
      });
      builder.on("close", (code) => {
        log.mark("Builder exited:", code);
        if (code === 0) {
          resolve();
        } else {
          reject(`Builder returned ${code}`);
        }
      });
    });
  }
}
