import AurPackageBase from "./AurPackageBase";

export default class UpdatedPackage {
  public constructor(public readonly pkg: AurPackageBase) {}
  public success = false;
  public buildDate: Date;
}
