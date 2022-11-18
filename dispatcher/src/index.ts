import ArchPackageBase from "./models/ArchPackageBase";
import log4js from "log4js";
import path from "path";
import config from "./models/config";
import AurPackageBase from "./models/AurPackageBase";

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

log.info("Dispatcher started");

(async () => {
  const pkg = new AurPackageBase("hyfetch", "aarch64");
  log.info("Update Source...");
  await pkg.updateSource();
  log.info("build needed:", pkg.rebuildNeeded);
  log.info("Build Package...");
  await pkg.build();
  log.info("build needed:", pkg.rebuildNeeded);
})();
