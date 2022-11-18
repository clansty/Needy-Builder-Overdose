import { spawn } from "child_process";

const DOCKER_COMMAND = "nerdctl"; // docker, podman ...

export default {
  run(
    image: string,
    config: {
      volumes?: { [path: string]: string };
      command?: string[];
      rm?: boolean;
    }
  ) {
    const args = ["run"];
    config.rm && args.push("--rm");
    if (config.volumes) {
      // 感觉反过来更正常一点
      for (const [dest, src] of Object.entries(config.volumes)) {
        args.push("-v");
        args.push(`${src}:${dest}`);
      }
    }
    args.push(image);
    config.command && args.push(...config.command);
    return spawn(DOCKER_COMMAND, args);
  },
};
