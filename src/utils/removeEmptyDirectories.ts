import fs from "fs/promises";
import * as path from "path";

export async function removeEmptyDirectories(repoPath: string): Promise<void> {
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await walk(fullPath);
        try {
          await fs.rmdir(fullPath);
        } catch (error) {
          // Directory not empty, ignore
        }
      }
    }
  };

  await walk(repoPath);
}
