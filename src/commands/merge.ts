import * as path from "path";
import * as fs from "fs/promises";
import {
  ObjectStore,
  CommitManager,
  TreeManager,
  Workspace,
  BlobManager,
  Index,
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
  const workspace = new Workspace();
  const index = new Index(repoPath);
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const blobManager = new BlobManager(objectStore);

  await config.loadAll();

  let authorInfo = author;
  if (!authorInfo) {
    try {
      authorInfo = await config.getUserInfo();
    } catch (error: any) {
      console.error(error.message);
      process.exit(1);
    }
  }

  // Load current index
  await index.load();

  // Check if there are uncommitted changes
  if (index.getAll().length > 0) {
    console.error(
      "Cannot merge: you have uncommitted changes. Commit or stash them first.",
    );
    process.exit(1);
  }

  // Get current HEAD
  const headRef = (await fs.readFile(headPath, "utf-8")).trim();
  let currentCommitHash: string;

  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    currentCommitHash = await fs.readFile(refPath, "utf-8");
    currentCommitHash = currentCommitHash.trim();
  } else {
    currentCommitHash = headRef;
  }

  // Get the commit hash of the branch to merge
  const branchPath = path.join(
    repoPath,
    ".loonygit",
    "refs",
    "heads",
    branchName,
  );
  let mergeCommitHash: string;
  try {
    mergeCommitHash = await fs.readFile(branchPath, "utf-8");
    mergeCommitHash = mergeCommitHash.trim();
  } catch (error) {
    console.error(`Branch '${branchName}' not found`);
    process.exit(1);
  }

  // Get commit objects
  const currentCommit = await commitManager.getCommit(currentCommitHash);
  const mergeCommit = await commitManager.getCommit(mergeCommitHash);

  // Find merge base
  const mergeBaseHash = await findMergeBase(
    commitManager,
    currentCommitHash,
    mergeCommitHash,
  );

  // Check if already up to date or fast-forward possible
  if (mergeBaseHash === mergeCommitHash) {
    console.log(`Already up to date with '${branchName}'`);
    return;
  }

  if (mergeBaseHash === currentCommitHash) {
    // Fast-forward merge
    console.log(`Fast-forward merge from ${branchName}`);
    await fastForwardMerge(
      repoPath,
      branchName,
      currentCommitHash,
      mergeCommitHash,
      treeManager,
      index,
      workspace,
    );
    return;
  }

  // Perform three-way merge
  console.log(`Performing three-way merge from ${branchName}`);

  // Get trees for each commit
  const baseTree = await treeManager.getTree(mergeBaseHash);
  const currentTree = await treeManager.getTree(currentCommit.tree);
  const mergeTree = await treeManager.getTree(mergeCommit.tree);

  // Perform recursive merge
  const mergedEntries = await mergeTrees(
    baseTree,
    currentTree,
    mergeTree,
    treeManager,
    blobManager,
    workspace,
    repoPath,
  );

  // Create new tree from merged entries
  const newTree = await treeManager.buildTreeFromPath(mergedEntries);

  // Check for conflicts
  const conflicts = await detectConflicts(mergedEntries);
  if (conflicts.length > 0) {
    console.error("Merge conflicts detected:");
    conflicts.forEach((conflict) => {
      console.error(`  ${conflict}`);
    });
    console.error("\nResolve conflicts and then commit with 'loonygit commit'");

    // Save conflict state in index
    await saveConflictState(index, mergedEntries, conflicts);
    await index.save();
    process.exit(1);
  }

  // Create merge commit
  const commitMessage = message || `Merge branch '${branchName}'`;
  const parents = [currentCommitHash, mergeCommitHash];
  const commit = await commitManager.createCommit(
    newTree.hash,
    parents,
    authorInfo,
    commitMessage,
  );

  // Update HEAD
  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    await fs.writeFile(refPath, commit.hash);
  } else {
    await fs.writeFile(headPath, commit.hash);
  }

  // Update index with merged files
  await updateIndexFromTree(
    index,
    newTree,
    treeManager,
    blobManager,
    workspace,
    repoPath,
  );
  await index.save();

  console.log(
    `Merge successful: [${commit.hash.slice(0, 7)}] ${commitMessage}`,
  );
}

async function findMergeBase(
  commitManager: CommitManager,
  commit1: string,
  commit2: string,
): Promise<string> {
  // BFS to find common ancestor
  const visited1 = new Set<string>();
  const visited2 = new Set<string>();
  const queue1: string[] = [commit1];
  const queue2: string[] = [commit2];

  while (queue1.length > 0 || queue2.length > 0) {
    if (queue1.length > 0) {
      const current = queue1.shift()!;
      if (visited2.has(current)) {
        return current;
      }
      visited1.add(current);
      const commit = await commitManager.getCommit(current);
      for (const parent of commit.parents) {
        if (!visited1.has(parent)) {
          queue1.push(parent);
        }
      }
    }

    if (queue2.length > 0) {
      const current = queue2.shift()!;
      if (visited1.has(current)) {
        return current;
      }
      visited2.add(current);
      const commit = await commitManager.getCommit(current);
      for (const parent of commit.parents) {
        if (!visited2.has(parent)) {
          queue2.push(parent);
        }
      }
    }
  }

  throw new Error("No common ancestor found");
}

async function fastForwardMerge(
  repoPath: string,
  branchName: string,
  currentCommit: string,
  targetCommit: string,
  treeManager: TreeManager,
  index: Index,
  workspace: Workspace,
): Promise<void> {
  const targetCommitObj = await treeManager.objectStore.getObject(targetCommit);
  // Parse the commit to get tree hash
  const commitStr = targetCommitObj.content.toString();
  const treeHash = commitStr.split("\n")[0].split(" ")[1];

  // Update working directory with the target commit's files
  await updateWorkingDirectoryFromTree(
    treeHash,
    treeManager,
    workspace,
    repoPath,
  );

  // Update index with the target commit's files
  await updateIndexFromTree(
    index,
    await treeManager.getTree(treeHash),
    treeManager,
    new BlobManager(treeManager.objectStore),
    workspace,
    repoPath,
  );
}

async function mergeTrees(
  baseTree: any,
  currentTree: any,
  mergeTree: any,
  treeManager: TreeManager,
  blobManager: BlobManager,
  workspace: Workspace,
  repoPath: string,
): Promise<Map<string, { hash: string; mode: "100644" | "100755" }>> {
  const mergedEntries = new Map<
    string,
    { hash: string; mode: "100644" | "100755" }
  >();
  const allPaths = new Set<string>();

  // Collect all paths from all trees
  const addPaths = (tree: any) => {
    if (tree && tree.entries) {
      tree.entries.forEach((entry: any) => allPaths.add(entry.path));
    }
  };

  addPaths(baseTree);
  addPaths(currentTree);
  addPaths(mergeTree);

  for (const path of allPaths) {
    const baseEntry = baseTree?.entries?.find((e: any) => e.path === path);
    const currentEntry = currentTree?.entries?.find(
      (e: any) => e.path === path,
    );
    const mergeEntry = mergeTree?.entries?.find((e: any) => e.path === path);

    // Apply merge logic
    const resolved = resolveMerge(baseEntry, currentEntry, mergeEntry);
    if (resolved) {
      mergedEntries.set(path, resolved);
    }
  }

  return mergedEntries;
}

function resolveMerge(
  baseEntry: any,
  currentEntry: any,
  mergeEntry: any,
): { hash: string; mode: "100644" | "100755" } | null {
  // Both sides unchanged
  if (
    currentEntry?.hash === baseEntry?.hash &&
    mergeEntry?.hash === baseEntry?.hash
  ) {
    return currentEntry || mergeEntry;
  }

  // Only one side changed
  if (
    currentEntry?.hash !== baseEntry?.hash &&
    mergeEntry?.hash === baseEntry?.hash
  ) {
    return currentEntry;
  }

  if (
    mergeEntry?.hash !== baseEntry?.hash &&
    currentEntry?.hash === baseEntry?.hash
  ) {
    return mergeEntry;
  }

  // Both sides changed to same thing
  if (currentEntry?.hash === mergeEntry?.hash) {
    return currentEntry;
  }

  // Conflict - both sides changed differently
  return null; // Indicates conflict
}

async function detectConflicts(
  entries: Map<string, { hash: string; mode: "100644" | "100755" }>,
): Promise<string[]> {
  const conflicts: string[] = [];
  for (const [path, entry] of entries) {
    if (!entry) {
      conflicts.push(path);
    }
  }
  return conflicts;
}

async function saveConflictState(
  index: Index,
  entries: Map<string, { hash: string; mode: "100644" | "100755" }>,
  conflicts: string[],
): Promise<void> {
  // Save current state with conflict markers
  for (const [path, entry] of entries) {
    if (entry) {
      index.add({
        hash: entry.hash,
        mode: entry.mode,
        path,
        stage: 0,
        mtime: Date.now(),
        size: 0,
      });
    }
  }
}

async function updateIndexFromTree(
  index: Index,
  tree: any,
  treeManager: TreeManager,
  blobManager: BlobManager,
  workspace: Workspace,
  repoPath: string,
): Promise<void> {
  if (!tree || !tree.entries) return;

  for (const entry of tree.entries) {
    if (entry.type === "blob") {
      const blob = await blobManager.getBlob(entry.hash);
      const content = blob.content;

      index.add({
        hash: entry.hash,
        mode: entry.mode,
        path: entry.path,
        stage: 0,
        mtime: Date.now(),
        size: content.length,
      });
    } else if (entry.type === "tree") {
      const subtree = await treeManager.getTree(entry.hash);
      await updateIndexFromTree(
        index,
        subtree,
        treeManager,
        blobManager,
        workspace,
        repoPath,
      );
    }
  }
}

async function updateWorkingDirectoryFromTree(
  treeHash: string,
  treeManager: TreeManager,
  workspace: Workspace,
  repoPath: string,
): Promise<void> {
  const tree = await treeManager.getTree(treeHash);

  for (const entry of tree.entries) {
    const fullPath = path.join(repoPath, entry.path);
    if (entry.type === "blob") {
      const blob = await treeManager.objectStore.getObject(entry.hash);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, blob.content);
    } else if (entry.type === "tree") {
      await updateWorkingDirectoryFromTree(
        entry.hash,
        treeManager,
        workspace,
        repoPath,
      );
    }
  }
}
