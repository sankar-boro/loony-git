import * as path from "path";
import * as fs from "fs/promises";
import { shouldIgnore } from "../utils";

export async function readWorkspaceFiles(rootPath: string) {
  const files: string[] = [];

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Check loonyignore
      if (shouldIgnore(fullPath)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push(path.relative(rootPath, fullPath));
      }
    }
  };

  await walk(rootPath);
  return files;
}
