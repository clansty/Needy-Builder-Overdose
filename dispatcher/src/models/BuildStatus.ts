import ArchPackageBase from "./ArchPackageBase";
import PackageList from "./PackageList";

export default class BuildStatus {
  public constructor(public readonly startTime = new Date()) {}

  public endTime = "N/A";
  public allPackages = new PackageList<ArchPackageBase[]>(() => []);
  
}
