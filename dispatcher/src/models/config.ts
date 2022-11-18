import YAML from "yaml";
import fs from "fs";
import { Arch } from "../types/enums";
import { Builder, PackageInit } from "../types/ConfigTypes";

const CONFIG_PATH = process.env.CONFIG;

export default YAML.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as {
  builders: { [key in Arch]: Builder };
  paths: {
    sources: { [key in Arch]: string };
    logs: string;
    program: string;
  };
  pacman: Array<PackageInit>;
  dockerImage: string;
};
