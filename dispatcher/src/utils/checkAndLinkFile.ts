import fsP from "fs/promises";
import fs from "fs";

// ln -sf
export default async (src: string, dist: string) => {
  const existed = fs.existsSync(dist);
  if (existed && (await fsP.readlink(dist)) === src) {
    return;
  }
  if (existed) {
    await fsP.unlink(dist);
  }
  await fsP.symlink(src, dist);
};
