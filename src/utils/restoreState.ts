import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { headPath, branchesPath, indexPath } from "../paths";
import { checkoutTree } from "./checkoutTree";
import { updateIndexFromTree } from "./updateIndexFromTree";

export async function restoreState(
  repoPath: string,
  commitHash: string,
  branchName: string | null,
  workspace: Workspace,
): Promise<void> {
  try {
    const objectStore = new ObjectStore();
    const commitManager = new CommitManager(objectStore);
    const treeManager = new TreeManager(objectStore);

    // Restore HEAD
    if (branchName) {
      await fs.writeFile(headPath, `ref: refs/heads/${branchName}`);
    } else {
      await fs.writeFile(headPath, commitHash);
    }

    // Restore workspace
    const commit = await commitManager.readCommit(commitHash);
    await checkoutTree(repoPath, commit.tree, treeManager, workspace);

    // Restore index
    await updateIndexFromTree(repoPath, commit.tree, treeManager, objectStore);

    console.log("State restored successfully");
  } catch (error) {
    console.error(`Failed to restore state: ${(error as Error).message}`);
  }
}
