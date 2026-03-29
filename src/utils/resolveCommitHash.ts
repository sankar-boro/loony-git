import fs from "fs/promises";
import * as path from "path";
import { ObjectStore } from "../core";
import { headPath, OBJECTS } from "../paths";

export async function resolveCommitHash(
  prefix: string,
  objectStore?: ObjectStore,
): Promise<string | null> {
  // Try to resolve short hash
  if (prefix.length >= 4 && prefix.length < 40) {
    const objectsDir = path.join(OBJECTS);
    try {
      const dirs = await fs.readdir(objectsDir);
      for (const dir of dirs) {
        if (dir.length === 2 && /^[0-9a-f]+$/.test(dir)) {
          const files = await fs.readdir(path.join(objectsDir, dir));
          for (const file of files) {
            const fullHash = dir + file;
            if (fullHash.startsWith(prefix)) {
              return fullHash;
            }
          }
        }
      }
    } catch (error) {
      // No objects directory
    }
  }
  return null;
}
