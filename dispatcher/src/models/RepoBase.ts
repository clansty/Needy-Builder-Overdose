import path from "path";
import config from "./config";
import fs from "fs";

export default abstract class RepoBase {
  public constructor(public readonly DISTRIBUTION: string, public readonly arch: string) {
    fs.mkdirSync(this.path, { recursive: true });
  }

  get path() {
    return path.join(config.paths.repo, this.DISTRIBUTION, this.arch);
  }

  // 需要实现的添加包真实执行的方法
  protected abstract _addPackage(pkgPath: string[]): Promise<void>;
  private readonly addPackageQueue: Array<() => Promise<void>> = [];
  private addPackageRunning = false;
  // 队列空闲时立即添加，非空闲时排队。返回的 promise 会在这个包添加成功后 resolve
  public addPackage(pkgPath: string[]) {
    return new Promise<void>(async (resolve, reject) => {
      this.addPackageQueue.push(async () => {
        try {
          await this._addPackage(pkgPath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      if (this.addPackageRunning) {
        return;
      }
      this.addPackageRunning = true;
      while (true) {
        const nextTask = this.addPackageQueue.pop();
        if (!nextTask) {
          this.addPackageRunning = false;
          break;
        }
        await nextTask();
      }
    });
  }
}
