import log4js from "log4js";
import log4jsConfig from "./configs/log4jsConfig";
import MainRunController from "./controllers/MainRunController";

log4js.configure(log4jsConfig);

const log = log4js.getLogger("Main");

(async () => {
  log.info("Dispatcher started");

  const main = new MainRunController();
  await main.run();
})();
