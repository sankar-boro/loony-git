import {
  ObjectStore,
  CommitManager,
  TreeManager,
  Workspace,
  Index,
} from "../core";
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

  // Load current index (for untracked detection)
  const index = new Index(repoPath);
  await index.load();

  // Resolve target to commit hash and HEAD value
  let commitHash = target;
  let headValue = target;

  if (target.length !== 40 || !/^[0-9a-f]+$/.test(target)) {
    const branchRef = `refs/heads/${target}`;
    const branchPath = path.join(
      repoPath,
      ".loonygit",
      "refs",
      "heads",
      target,
    );
    try {
      commitHash = (await fs.readFile(branchPath, "utf-8")).trim();
      headValue = `ref: ${branchRef}`;
    } catch {
      throw new Error(`Unknown revision: ${target}`);
    }
  }

  // Read commit and tree
  const commit = await commitManager.readCommit(commitHash);
  const targetTreeHash = commit.tree;

  // Build desired index/tree representation
  const targetFiles = await treeManager.flattenTree(targetTreeHash);
  const workspaceFiles = await workspace.listFiles();

  // Do not checkout when untracked files exist in workspace
  const trackedFiles = new Set(index.getAll().map((entry) => entry.path));
  const untrackedFiles = workspaceFiles.filter((f) => !trackedFiles.has(f));
  if (untrackedFiles.length > 0) {
    throw new Error(
      `Cannot checkout ${target}: untracked files would be overwritten:\n` +
        untrackedFiles.map((f) => `  ${f}`).join("\n"),
    );
  }

  // Remove files that are tracked but not part of target tree (branch switch cleanup)
  for (const file of workspaceFiles) {
    if (!targetFiles.has(file)) {
      await workspace.deleteFile(file).catch(() => {
        // ignore files that may have been removed already
      });
    }
  }

  // Write checked out files from tree
  for (const [filePath, blobHash] of targetFiles.entries()) {
    const { content } = await objectStore.read(blobHash);
    await workspace.writeFile(filePath, content);
  }

  // Update index to match tree state
  const newIndex = new Index(repoPath);
  await newIndex.updateFromTree(treeManager, targetTreeHash);
  await newIndex.save();

  // Update HEAD
  await fs.writeFile(headPath, headValue);

  console.log(`HEAD is now at ${commitHash.slice(0, 7)} ${commit.message}`);
}
