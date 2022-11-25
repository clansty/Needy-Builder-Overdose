import fsP from "fs/promises";
import path from "path";

const getPkgAttrMulti = (lines: string[], attr: string): string[] => {
  let index = lines.indexOf(`%${attr}%`);
  if (index < 0) {
    return [];
  }
  let res = [];
  while (lines[index + 1]) {
    index++;
    res.push(lines[index]);
  }
  return res;
};

const getPkgAttr = (lines: string[], attr: string) => getPkgAttrMulti(lines, attr).join("\n");

/**
 * repo.db.tar.*z 里面的某个包的信息
 * @param repoDbDir 解包 db 得到对应包的文件夹
 */
export default async (repoDbDir: string) => {
  const lines = (await fsP.readFile(path.join(repoDbDir, "desc"), "utf-8")).split("\n");
  return {
    name: getPkgAttr(lines, "NAME"),
    base: getPkgAttr(lines, "BASE"),
    desc: getPkgAttr(lines, "DESC"),
    version: getPkgAttr(lines, "VERSION"),
    csize: Number(getPkgAttr(lines, "CSIZE")),
    isize: Number(getPkgAttr(lines, "ISIZE")),
    url: getPkgAttr(lines, "URL"),
    provides: getPkgAttrMulti(lines, "PROVIDES"),
    depends: getPkgAttrMulti(lines, "DEPENDS"),
    conflicts: getPkgAttrMulti(lines, "CONFLICTS"),
    buildTime: new Date(Number.parseInt(getPkgAttr(lines, "BUILDDATE")) * 1000).toISOString(),
    filename: getPkgAttr(lines, "FILENAME"),
  };
};
