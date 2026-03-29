import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { headPath, branchesPath, indexPath } from "../paths";
import {
  getCurrentHead,
  getCurrentBranch,
  getAllFiles,
  removeEmptyDirectories,
  restoreState,
  updateIndexFromTree,
  resolveCommitHash,
  checkoutTree,
  getTrackedFiles,
} from "../utils";

export async function checkoutCommand(
  repoPath: string,
  target: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const objectStore = new ObjectStore();
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const workspace = new Workspace();

  try {
    // Check if workspace is clean (unless force flag is used)
    if (!options.force) {
      const isClean = await isWorkspaceClean(repoPath, workspace);
      if (!isClean) {
        throw new Error(
          "Cannot checkout: local changes would be overwritten. " +
            "Please commit your changes or use --force to discard changes.",
        );
      }
    }

    // Resolve target to commit hash and track if it's a branch
    let commitHash: string | null = null;
    let isBranch = false;

    if (target.length === 40 && /^[0-9a-f]+$/.test(target)) {
      // Direct commit hash
      commitHash = target;

      // Check if this hash corresponds to a branch
      const branches = await fs.readdir(branchesPath).catch(() => []);
      for (const branch of branches) {
        const branchPath = path.join(branchesPath, branch);
        const branchHash = (await fs.readFile(branchPath, "utf-8")).trim();
        if (branchHash === commitHash) {
          isBranch = true;
          target = branch; // Update target to branch name
          break;
        }
      }
    } else {
      // Check if it's a branch
      const branchPath = path.join(branchesPath, target);
      try {
        commitHash = (await fs.readFile(branchPath, "utf-8")).trim();
        isBranch = true;
      } catch (error) {
        // Not a branch, try to resolve as a commit hash prefix
        commitHash = await resolveCommitHash(target);
        if (!commitHash) {
          throw new Error(`Unknown revision: ${target}`);
        }
      }
    }

    // Verify commit exists
    try {
      await commitManager.readCommit(commitHash);
    } catch (error) {
      throw new Error(`Commit ${commitHash} does not exist`);
    }

    // Save current state for rollback in case of error
    const currentHead = await getCurrentHead();
    const currentBranch = await getCurrentBranch(repoPath);

    try {
      // Clear workspace and index
      await clearWorkspace(repoPath, workspace);

      // Read and checkout commit tree
      const commit = await commitManager.readCommit(commitHash);
      await checkoutTree(repoPath, commit.tree, treeManager, workspace);

      // Update HEAD
      if (isBranch) {
        // Switch to branch: update HEAD to point to branch
        await fs.writeFile(headPath, `ref: refs/heads/${target}`);
        console.log(`Switched to branch '${target}'`);
      } else {
        // Detached HEAD: write commit hash directly
        await fs.writeFile(headPath, commitHash);
        console.log(
          `HEAD is now at ${commitHash.slice(0, 7)} ${commit.message || "commit"}`,
        );
      }

      // Update index with the new tree state
      await updateIndexFromTree(
        repoPath,
        commit.tree,
        treeManager,
        objectStore,
      );

      // Update working directory timestamps in index
      await updateIndexTimestamps(repoPath, workspace);
    } catch (error) {
      // Rollback to previous state on error
      console.error(`Checkout failed: ${(error as Error).message}`);
      console.log("Rolling back...");

      if (currentHead) {
        await restoreState(repoPath, currentHead, currentBranch, workspace);
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error during checkout: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function isWorkspaceClean(
  repoPath: string,
  workspace: Workspace,
): Promise<boolean> {
  try {
    // Read index
    let index: any;
    try {
      const indexData = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(indexData);
    } catch (error) {
      // No index yet, workspace is clean
      return true;
    }

    // Check for uncommitted changes
    const files = await getAllFiles(repoPath);

    for (const file of files) {
      // Skip .loonygit directory
      if (file.startsWith(".loonygit")) continue;

      const filePath = path.join(repoPath, file);
      const indexPath = file;

      try {
        const stats = await fs.stat(filePath);
        const currentHash = await workspace.hashFile(file);

        if (index[indexPath]) {
          // File exists in index
          if (index[indexPath].hash !== currentHash) {
            return false; // Modified file
          }
        } else {
          // File not in index
          return false; // Untracked file
        }
      } catch (error) {
        // File might have been deleted
        if (index[indexPath]) {
          return false; // Deleted file
        }
      }
    }

    return true;
  } catch (error) {
    // If we can't determine, assume not clean
    return false;
  }
}

async function clearWorkspace(
  repoPath: string,
  workspace: Workspace,
): Promise<void> {
  // Get all tracked files from index or HEAD
  const trackedFiles = await getTrackedFiles(repoPath);

  // Remove tracked files from workspace
  for (const file of trackedFiles) {
    const fullPath = path.join(repoPath, file);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  // Also remove empty directories (optional)
  await removeEmptyDirectories(repoPath);
}

async function updateIndexTimestamps(
  repoPath: string,
  workspace: Workspace,
): Promise<void> {
  try {
    const indexData = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(indexData);

    for (const [file, entry] of Object.entries(index)) {
      try {
        const stats = await fs.stat(path.join(repoPath, file));
        (entry as any).timestamp = stats.mtimeMs;
        (entry as any).size = stats.size;
      } catch (error) {
        // File might not exist, keep old timestamp
      }
    }

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch (error) {
    // No index to update
  }
}
