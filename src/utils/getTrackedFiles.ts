import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { getCurrentHead } from "./getCurrentHead";
import { INDEX } from "../paths";

export async function getTrackedFiles(repoPath: string): Promise<string[]> {
  try {
    // Try to get files from index first
    const indexData = await fs.readFile(INDEX, "utf-8").catch(() => null);
    if (indexData) {
      const index = JSON.parse(indexData);
      return Object.keys(index);
    }

    // If no index, get from HEAD
    const headRef = await getCurrentHead();
    if (headRef) {
      const objectStore = new ObjectStore();
      const commitManager = new CommitManager(objectStore);
      const treeManager = new TreeManager(objectStore);

      const commit = await commitManager.readCommit(headRef);
      const files: string[] = [];

      const collectFiles = async (treeHash: string, basePath: string = "") => {
        const tree = await treeManager.readTree(treeHash);
        for (const entry of tree.entries) {
          const fullPath = basePath
            ? path.join(basePath, entry.name)
            : entry.name;
          if (entry.mode === "040000") {
            await collectFiles(entry.hash, fullPath);
          } else {
            files.push(fullPath);
          }
        }
      };

      await collectFiles(commit.tree);
      return files;
    }

    return [];
  } catch (error) {
    return [];
  }
}
