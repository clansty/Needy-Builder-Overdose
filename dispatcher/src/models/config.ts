import YAML from "yaml";
import fs from "fs";
import { Arch } from "../types/enums";
import PackageInit from "../types/PackageInit";

const CONFIG_PATH = process.env.CONFIG;

export default YAML.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
  hosts: {};
  paths: {
    sources: { [key in Arch]: string };
    logs: string;
    program: string;
  };
  pacman: Array<PackageInit>;
};
