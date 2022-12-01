import { spawn } from "child_process";
import { DockerRunConfig, SshConfig } from "../types/ConfigTypes";

const docker = {
  runArgs(params: DockerRunConfig) {
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
    params.platform && args.push("--platform", params.platform);
    args.push(params.dockerImage);
    params.command && args.push(...params.command);
    return args;
  },
  run(params: DockerRunConfig) {
    return spawn(params.dockerCommand, docker.runArgs(params));
  },
  runOverSsh(params: DockerRunConfig & SshConfig) {
    const args = [params.host];
    params.port && args.push("-p", params.port);
    params.extraArgs && args.push(...params.extraArgs);
    args.push("--", params.dockerCommand, ...docker.runArgs(params));
    return spawn("ssh", args);
  },
  pullArgs(params: DockerRunConfig) {
    const args = ["pull"];
    params.platform && args.push("--platform", params.platform);
    args.push(params.dockerImage);
    return args;
  },
  pull(params: DockerRunConfig) {
    return spawn(params.dockerCommand, docker.pullArgs(params));
  },
  pullOverSsh(params: DockerRunConfig & SshConfig) {
    const args = [params.host];
    params.port && args.push("-p", params.port);
    params.extraArgs && args.push(...params.extraArgs);
    args.push("--", params.dockerCommand, ...docker.pullArgs(params));
    return spawn("ssh", args);
  },
};

export default docker;
