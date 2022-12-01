import log4js from "log4js";
import log4jsConfig from "./configs/log4jsConfig";
import MainRunController from "./controllers/MainRunController";
import sleep from "sleep-promise";

log4js.configure(log4jsConfig);

const log = log4js.getLogger("Main");

(async () => {
  log.info("Dispatcher started");

  const main = new MainRunController();
  while (true) {
    await main.run();
    await sleep(1000 * 60 * 60 * 6);
  }
})();
