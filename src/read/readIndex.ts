import * as path from "path";
import * as fs from "fs/promises";
import { IndexEntry } from "../types";

export async function readIndex(indexPath: string) {
  let index: Map<string, IndexEntry> = new Map();

  try {
    const indexContent = await fs.readFile(indexPath, "utf-8");
    const lines = indexContent.split("\n").filter((l) => l);
    for (const line of lines) {
      const [hash, mode, path, stage, mtime, size] = line.split(" ");
      index.set(path, {
        hash,
        mode,
        path,
        stage: parseInt(stage),
        mtime: parseFloat(mtime),
        size: parseInt(size),
      });
    }
  } catch (error) {
    // Index doesn't exist yet
  }

  return index;
}
