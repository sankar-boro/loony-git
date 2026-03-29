import * as path from "path";
import * as fs from "fs/promises";
import {
  ObjectStore,
  CommitManager,
  TreeManager,
  Workspace,
  Index,
  BlobManager,
} from "../core";
import { Config } from "../core/config";
import { headPath } from "../paths";

export async function mergeCommand(
  repoPath: string,
  branchName: string,
  message?: string,
  author?: { name: string; email: string },
): Promise<void> {
  const config = new Config();
  const objectStore = new ObjectStore();
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const workspace = new Workspace();
  const index = new Index(repoPath);

  await config.loadAll();

  let authorInfo = author;
  if (!authorInfo) {
    try {
      authorInfo = await config.getUserInfo();
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  await index.load();

  const workspaceStatus = await index.compareWithWorkspace(workspace);
  if (
    workspaceStatus.modified.length > 0 ||
    workspaceStatus.deleted.length > 0 ||
    workspaceStatus.added.length > 0
  ) {
    throw new Error(
      "Cannot merge: uncommitted changes present. Commit or stash first.",
    );
  }

  const headRef = (await fs.readFile(headPath, "utf-8")).trim();
  const currentCommitHash = await resolveHeadCommit(repoPath, headRef);
  const mergeCommitHash = await resolveBranchCommit(repoPath, branchName);

  const currentCommit = await commitManager.getCommit(currentCommitHash);
  const mergeCommit = await commitManager.getCommit(mergeCommitHash);

  const mergeBaseHash = await findMergeBase(
    commitManager,
    currentCommitHash,
    mergeCommitHash,
  );

  if (mergeBaseHash === mergeCommitHash) {
    console.log(`Already up to date with '${branchName}'`);
    return;
  }

  if (mergeBaseHash === currentCommitHash) {
    console.log(`Fast-forward merge from '${branchName}'`);
    await doFastForward(
      repoPath,
      headRef,
      mergeCommit,
      treeManager,
      workspace,
      index,
    );

    console.log(`Fast-forward successful: ${mergeCommitHash.slice(0, 7)}`);
    return;
  }

  throw new Error("Non-fast-forward merge is not yet supported");
}

async function resolveHeadCommit(repoPath: string, headRef: string): Promise<string> {
  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    return (await fs.readFile(refPath, "utf-8")).trim();
  }
  return headRef;
}

async function resolveBranchCommit(repoPath: string, branchName: string): Promise<string> {
  const branchPath = path.join(repoPath, ".loonygit", "refs", "heads", branchName);
  try {
    return (await fs.readFile(branchPath, "utf-8")).trim();
  } catch {
    throw new Error(`Branch '${branchName}' not found`);
  }
}

async function findMergeBase(
  commitManager: CommitManager,
  commit1: string,
  commit2: string,
): Promise<string> {
  const visited1 = new Set<string>();
  const visited2 = new Set<string>();
  const queue1 = [commit1];
  const queue2 = [commit2];

  while (queue1.length || queue2.length) {
    if (queue1.length) {
      const current = queue1.shift()!;
      if (visited2.has(current)) return current;
      visited1.add(current);
      const commit = await commitManager.getCommit(current);
      for (const parent of commit.parents) {
        if (!visited1.has(parent)) queue1.push(parent);
      }
    }

    if (queue2.length) {
      const current = queue2.shift()!;
      if (visited1.has(current)) return current;
      visited2.add(current);
      const commit = await commitManager.getCommit(current);
      for (const parent of commit.parents) {
        if (!visited2.has(parent)) queue2.push(parent);
      }
    }
  }

  throw new Error("No common ancestor found");
}

async function doFastForward(
  repoPath: string,
  headRef: string,
  targetCommit: any,
  treeManager: TreeManager,
  workspace: Workspace,
  index: Index,
): Promise<void> {
  await clearWorkspace(repoPath, workspace);
  await checkoutTree(targetCommit.tree, treeManager, workspace, repoPath);

  await index.updateFromTree(treeManager, targetCommit.tree);
  await index.save();

  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    await fs.writeFile(refPath, targetCommit.hash);
  } else {
    await fs.writeFile(headPath, targetCommit.hash);
  }
}

async function clearWorkspace(repoPath: string, workspace: Workspace): Promise<void> {
  const files = await workspace.listFiles();
  for (const file of files) {
    await workspace.deleteFile(file).catch(() => {});
  }
}

async function checkoutTree(
  treeHash: string,
  treeManager: TreeManager,
  workspace: Workspace,
  repoPath: string,
  basePath = "",
): Promise<void> {
  const tree = await treeManager.getTree(treeHash);
  for (const entry of tree.entries) {
    const fullPath = basePath ? path.join(basePath, entry.name) : entry.name;
    if (entry.mode === "040000") {
      await checkoutTree(entry.hash, treeManager, workspace, repoPath, fullPath);
    } else {
      const { content } = await treeManager.objectStore.read(entry.hash);
      await workspace.writeFile(fullPath, content);
    }
  }
}
