import fs from "fs";

// ln -sf
export default (src: string, dist: string) => {
  try {
    const existed = fs.existsSync(dist);
    if (existed && fs.readlinkSync(dist) === src) {
      return;
    }
    if (existed) {
      fs.unlinkSync(dist);
    }
    fs.symlinkSync(src, dist);
  } catch (error) {}
};
