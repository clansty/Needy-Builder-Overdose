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
  }

  get aurGitUrl() {
    return `https://aur.archlinux.org/${this.pkgbase}.git`;
  }

  public updateSource() {
    const dirExists = fs.existsSync(this.path);
    let command: ChildProcessWithoutNullStreams;
    if (dirExists) {
      command = spawn("git", ["pull"], {
        cwd: this.path,
      });
    } else {
      command = spawn("git", ["clone", this.aurGitUrl, this.path]);
    }
    return wrapChildProcess(command, this.log);
  }
}
