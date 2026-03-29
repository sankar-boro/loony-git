import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";

import { headPath } from "../paths";

export async function checkoutCommand(
  repoPath: string,
  target: string,
): Promise<void> {
  const objectStore = new ObjectStore();
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const workspace = new Workspace();

  // Resolve target to commit hash
  let commitHash = target;
  if (target.length === 40 && /^[0-9a-f]+$/.test(target)) {
    // Already a hash
  } else {
    // Check if it's a branch
    const branchPath = path.join(
      repoPath,
      ".loonygit",
      "refs",
      "heads",
      target,
    );
    try {
      commitHash = (await fs.readFile(branchPath, "utf-8")).trim();
    } catch (error) {
      throw new Error(`Unknown revision: ${target}`);
    }
  }

  // Read commit
  const commit = await commitManager.readCommit(commitHash);
  const tree = await treeManager.readTree(commit.tree);

  // Recursively checkout tree
  const checkoutTree = async (treeHash: any, basePath: string = "") => {
    const tree = await treeManager.readTree(treeHash);

    for (const entry of tree.entries) {
      const fullPath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.mode === "040000") {
        // Directory
        await checkoutTree(entry.hash, fullPath);
      } else {
        // File
        const { content } = await objectStore.read(entry.hash);
        // await workspace.writeFile(fullPath, content);
      }
    }
  };

  await checkoutTree(commit.tree);

  // Update HEAD
  // await fs.writeFile(headPath, "ref: refs/heads/" + target);

  console.log(`HEAD is now at ${commitHash.slice(0, 7)} ${commit.message}`);
}
