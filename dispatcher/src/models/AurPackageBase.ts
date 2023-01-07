import { Arch } from "../types/enums";
import { PackageInit } from "../types/ConfigTypes";
import ArchPackageBase from "./ArchPackageBase";
import fs from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import wrapChildProcess from "../utils/wrapChildProcess";

export default class AurPackageBase extends ArchPackageBase {
  public constructor(init: PackageInit, arch: Arch) {
    const pkgbase = typeof init === "string" ? init : init.p;
    super(pkgbase, arch);
    if (typeof init === "object") {
      this.extraDeps = init.extraDeps || "";
      this.ignorePkgs = init.ignorePkgs || "";
    }
  }

  get aurGitUrl() {
    return `https://aur.archlinux.org/${this.pkgbase}.git`;
  }

  get aurUrl() {
    return `https://aur.archlinux.org/packages/${this.pkgbase}`;
  }

  public async updateSource() {
    const dirExists = fs.existsSync(this.path);
    let command: ChildProcessWithoutNullStreams;
    if (dirExists) {
      await wrapChildProcess(
        spawn("git", ["reset", "--hard"], {
          cwd: this.path,
        }),
        this.log
      );
      command = spawn("git", ["pull"], {
        cwd: this.path,
      });
    } else {
      command = spawn("git", ["clone", this.aurGitUrl, this.path]);
    }
    return await wrapChildProcess(command, this.log);
  }
}
