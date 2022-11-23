import path from "path";
import AurPackageBase from "./AurPackageBase";
import config from "./config";
import PackageList from "./PackageList";
import UpdatedPackage from "./UpdatedPackage";
import date from "date-format";
import fsP from "fs/promises";
import fs from "fs";

export default class BuildStatus {
  public constructor(public readonly startTime = new Date()) {}

  // 运行时状态保存到 statusFile，currentFile 链接到 statusFile，运行结束时 lastFile 链接到 statusFile
  private get statusFile() {
    return path.join(config.paths.logs, `run.${date("yyyy-MM-dd.hhmmss", this.startTime)}.json`);
  }
  private readonly currentFile = path.join(config.paths.logs, "run.current.json");
  private readonly lastFile = path.join(config.paths.logs, "run.last.json");

  public endTime = "N/A";

  public allPackages = new PackageList<AurPackageBase[]>(() => []);

  public updatedPackages = new PackageList<UpdatedPackage[]>(() => []);

  public errors: string[] = [];

  public async saveStatus(linkLastFile = false) {
    const json = {
      startTime: this.startTime,
      endTime: this.endTime,
      updatedPackages: Object.fromEntries(
        Object.keys(config.arches).map((arch) => [
          arch,
          (this.updatedPackages[arch] as UpdatedPackage[]).map((pkg) => ({
            pkgbase: pkg.pkg.pkgbase,
            success: pkg.success,
            buildDate: pkg.buildDate,
          })),
        ])
      ),
      errors: this.errors,
    };
    await fsP.writeFile(this.statusFile, JSON.stringify(json));
    await this.checkAndLinkFile(this.statusFile, this.currentFile);
    if (linkLastFile) {
      await this.checkAndLinkFile(this.statusFile, this.lastFile);
    }
  }

  private async checkAndLinkFile(src: string, dist: string) {
    const existed = await fs.existsSync(dist);
    if (existed && (await fsP.readlink(dist)) === src) {
      return;
    }
    if (existed) {
      await fsP.unlink(dist);
    }
    await fsP.symlink(src, dist);
  }
}
