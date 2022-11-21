export default class PackageList<T> {
  public x86_64: T;
  public aarch64: T;
  public i686: T;
  public loong64: T;
  public riscv64: T;

  public constructor(init: () => T) {
    this.x86_64 = init();
    this.aarch64 = init();
    this.i686 = init();
    this.loong64 = init();
    this.riscv64 = init();
  }
}
