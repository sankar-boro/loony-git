import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { headPath, branchesPath, indexPath } from "../paths";

export async function updateIndexFromTree(
  repoPath: string,
  treeHash: string,
  treeManager: TreeManager,
  objectStore: ObjectStore,
): Promise<void> {
  const index: Record<string, any> = {};

  const addToIndex = async (treeHash: string, basePath: string = "") => {
    const tree = await treeManager.readTree(treeHash);

    for (const entry of tree.entries) {
      const fullPath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.mode === "040000") {
        await addToIndex(entry.hash, fullPath);
      } else {
        index[fullPath] = {
          hash: entry.hash,
          mode: entry.mode,
          timestamp: Date.now(),
          size: (await objectStore.read(entry.hash)).content.length,
        };
      }
    }
  };

  await addToIndex(treeHash);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}
