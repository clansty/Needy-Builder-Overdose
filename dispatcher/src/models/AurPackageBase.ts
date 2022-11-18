import { Arch } from "../types/enums";
import PackageInit from "../types/PackageInit";
import ArchPackageBase from "./ArchPackageBase";
import fs from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

export default class AurPackageBase extends ArchPackageBase {
  public constructor(init: PackageInit, arch: Arch) {
    const pkgbase = typeof init === "string" ? init : init.p;
    super(pkgbase, arch);
  }

  get aurGitUrl() {
    return `https://aur.archlinux.org/${this.pkgbase}.git`;
  }

  public updateSource() {
    return new Promise<void>((resolve, reject) => {
      const dirExists = fs.existsSync(this.path);
      let command: ChildProcessWithoutNullStreams;
      if (dirExists) {
        command = spawn("git", ["pull"], {
          cwd: this.path,
        });
      } else {
        command = spawn("git", ["clone", this.aurGitUrl, this.path]);
      }
      command.stdout.on("data", (data) => {
        this.log.info(data.toString("utf8"));
      });
      command.stderr.on("data", (data) => {
        this.log.error(data.toString("utf8"));
      });
      command.on("close", (code) => {
        this.log.mark("Git exited:", code);
        if (code === 0) {
          resolve();
        } else {
          reject(`Git returned ${code}`);
        }
      });
    });
  }
}
