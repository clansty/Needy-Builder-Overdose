import { Arch } from "../types/enums";

export default class PackageList<T> {
  public x86_64: T;
  public aarch64: T;
  public i686: T;
  public loong64: T;
  public riscv64: T;

  public constructor(init: (arch: Arch) => T) {
    this.x86_64 = init("x86_64");
    this.aarch64 = init("aarch64");
    this.i686 = init("i686");
    this.loong64 = init("loong64");
    this.riscv64 = init("riscv64");
  }
}
