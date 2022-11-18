import { spawn } from "child_process";
import { DockerRunConfig, SshConfig } from "../types/ConfigTypes";

const docker = {
  runArgs(image: string, params: DockerRunConfig) {
    const args = ["run"];
    params.rm && args.push("--rm");
    if (params.volumes) {
      // 感觉反过来更正常一点
      for (const [dest, src] of Object.entries(params.volumes)) {
        args.push("-v", `${src}:${dest}`);
      }
    }
    if (params.env) {
      for (const [name, value] of Object.entries(params.volumes)) {
        args.push("-e", `${name}=${value}`);
      }
    }
    args.push(image);
    params.command && args.push(...params.command);
    return args;
  },
  run(image: string, params: DockerRunConfig) {
    return spawn(params.dockerCommand, docker.runArgs(image, params));
  },
  runOverSsh(image: string, config: DockerRunConfig & SshConfig) {
    const args = [config.host];
    config.port && args.push("-p", config.port);
    config.extraArgs && args.push(...config.extraArgs);
    args.push("--", config.dockerCommand, ...docker.runArgs(image, config));
    return spawn("ssh", args);
  },
};

export default docker;
