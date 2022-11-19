import { Arch } from "./enums";

export type PackageInit =
  | string
  | ({
      [key in Arch]: boolean;
    } & {
      p: string;
      extraDeps: string;
    });

export type DockerRunConfig = {
  volumes?: { [path: string]: string };
  command?: string[];
  rm?: boolean;
  env?: { [name: string]: string };
  dockerCommand: string;
} & ArchConfig;

export type SshConfig = {
  host: string;
  port?: string;
  extraArgs?: string[];
};

export type LocalBuilder = {
  type: "local";
  dockerCommand: string;
};

export type SshDockerBuilder = {
  type: "ssh-docker";
  dockerCommand: string;
} & SshConfig;

export type SshCommandBuilder = {
  type: "ssh-command";
  command: string;
} & SshConfig;

export type Builder = LocalBuilder | SshDockerBuilder | SshCommandBuilder;

export type ArchConfig = {
  dockerImage: string;
  platform: string;
};
