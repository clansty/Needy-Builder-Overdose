import path from "path";
import { Arch } from "../types/enums";
import RepoBase from "./RepoBase";
import fs from "fs";
import fsP from "fs/promises";
import config from "./config";
import { spawn } from "child_process";
import log4js from "log4js";
import wrapChildProcess from "../utils/wrapChildProcess";

export default class ArchRepo extends RepoBase {
  protected readonly log: log4js.Logger;

  public constructor(arch: Arch) {
    super("archlinux", arch);
    this.log = log4js.getLogger(`Repo.${this.DISTRIBUTION}.${arch}`);
  }

  get dbPath() {
    return path.join(this.path, `${config.repoName}.db.tar.xz`);
  }

  protected async _addPackage(pkgPath: string[]): Promise<void> {
    const repoFiles = pkgPath.map((it) => path.join(this.path, path.basename(it)));
    for (const file of repoFiles) {
      try {
        await fsP.unlink(file);
      } catch {}
    }
    for (const file of pkgPath) {
      this.log.info("Linking file", file, "to", path.join(this.path, path.basename(file)));
      await fsP.symlink(file, path.join(this.path, path.basename(file)));
    }
    const repoAdd = spawn("repo-add", ["-R", this.dbPath, ...repoFiles]);
    return await wrapChildProcess(repoAdd, this.log);
  }
}
