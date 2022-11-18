import { Arch } from "./enums";

type PackageInit =
  | string
  | ({
      [key in Arch]: boolean;
    } & {
      p: string;
    });

export default PackageInit;
