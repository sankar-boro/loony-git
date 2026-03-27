import fs from "fs";

export function getStats(filePath: string) {
  return fs.statSync(filePath);
}
