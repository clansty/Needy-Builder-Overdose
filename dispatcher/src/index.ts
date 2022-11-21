import log4js from "log4js";
import path from "path";
import config from "./models/config";
import { ChildProcessWithoutNullStreams } from "child_process";
import docker from "./utils/docker";
import { ArchConfig } from "./types/ConfigTypes";
import wrapChildProcess from "./utils/wrapChildProcess";
import AurPackageBase from "./models/AurPackageBase";
import { Arch } from "./types/enums";

log4js.configure({
  appenders: {
    dispatcher: {
      type: "dateFile",
      filename: path.join(config.paths.logs, "dispatcher.log"),
      keepFileExt: true,
      alwaysIncludePattern: true,
      numBackups: 3650,
    },
    build: {
      type: "multiFile",
      base: path.join(config.paths.logs, "build") + "/",
      property: "categoryName",
      extension: ".log",
    },
    package: {
      type: "multiFile",
      base: path.join(config.paths.logs, "package") + "/",
      property: "categoryName",
      extension: ".log",
    },
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["dispatcher", "console"], level: "trace" },
    Build: { appenders: ["build", "console"], level: "trace" },
    Package: { appenders: ["package", "console"], level: "trace" },
  },
});

const log = log4js.getLogger("Dispatcher");

(async () => {
  log.info("Dispatcher started");

  for (const [arch, builder] of Object.entries(config.builders)) {
    log.info("Update docker image for", arch, "builder...");
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
          log.info("No need for type", builder.type);
          break;
      }
      await wrapChildProcess(command, log4js.getLogger(`UpdateDocker.${arch}`));
      log.info("Update docker image for", arch, "builder done");
    } catch (error) {
      log.error("Unable to update docker image for", arch, "builder");
    }
  }

  log.info("Fetch sources...");
  const allPackages: { [key in Arch]: Array<AurPackageBase> } = {
    x86_64: [],
    aarch64: [],
    i686: [],
    loong64: [],
    riscv64: [],
  };
  for (const pkgInit of config.pacman) {
    const pkg = new AurPackageBase(pkgInit, "x86_64");
    log.info("Fetching:", pkg.pkgbase, pkg.arch);
    try {
      await pkg.updateSource();
      allPackages.x86_64.push(pkg);
    } catch (error) {
      log.error(pkg.pkgbase, error);
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
      log.info("Fetching:", pkg.pkgbase, pkg.arch);
      try {
        await pkg.updateSource();
        allPackages[arch].push(pkg);
      } catch (error) {
        log.error(pkg.pkgbase, error);
        continue;
      }
    }
  }
})();
