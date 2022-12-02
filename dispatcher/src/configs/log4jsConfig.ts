import path from "path";
import config from "../models/config";
import log4js from "log4js";

export default {
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
      layout: { type: "messagePassThrough" },
    },
    package: {
      type: "multiFile",
      base: path.join(config.paths.logs, "package") + "/",
      property: "categoryName",
      extension: ".log",
    },
    repo: {
      type: "multiFile",
      base: path.join(config.paths.logs, "repos") + "/",
      property: "categoryName",
      extension: ".log",
    },
    console: { type: "console" },
  },
  categories: {
    default: { appenders: ["dispatcher", "console"], level: "trace" },
    Build: { appenders: ["build"], level: "trace" },
    Package: { appenders: ["package", "console"], level: "debug" },
    Repo: { appenders: ["repo", "console"], level: "trace" },
  },
} as log4js.Configuration;
