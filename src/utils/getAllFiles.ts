import fs from "fs/promises";
import * as path from "path";

export async function getAllFiles(repoPath: string): Promise<string[]> {
  const files: string[] = [];

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPath, fullPath);

      if (relativePath === ".loonygit") continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push(relativePath);
      }
    }
  };

  await walk(repoPath);
  return files;
}
