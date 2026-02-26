import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import { createTwoFilesPatch } from "diff";

export async function diffCommand(
  repoPath: string,
  commit1?: string,
  commit2?: string,
): Promise<void> {
  const objectStore = new ObjectStore();
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const workspace = new Workspace();

  let oldTreeHash: string;
  let newTreeHash: string;

  if (!commit1 && !commit2) {
    // Compare working directory with index
    // This would require reading index and comparing with workspace
    console.log("Working directory diff not implemented yet");
    return;
  } else if (commit1 && !commit2) {
    // Compare commit with working directory
    const commit = await commitManager.readCommit(commit1);
    oldTreeHash = commit.tree;
    newTreeHash = await buildTreeFromWorkspace(workspace, objectStore);
  } else if (commit1 && commit2) {
    // Compare two commits
    const commitA = await commitManager.readCommit(commit1);
    const commitB = await commitManager.readCommit(commit2);
    oldTreeHash = commitA.tree;
    newTreeHash = commitB.tree;
  } else {
    throw new Error("Invalid arguments");
  }

  // Get all files from both trees
  const oldFiles = await getFilesFromTree(treeManager, oldTreeHash);
  const newFiles = await getFilesFromTree(treeManager, newTreeHash);

  // Find changed files
  const allFiles = new Set([
    ...Object.keys(oldFiles),
    ...Object.keys(newFiles),
  ]);

  for (const file of allFiles) {
    const oldHash = oldFiles[file];
    const newHash = newFiles[file];

    if (oldHash === newHash) continue;

    // Read contents
    let oldContent = "";
    let newContent = "";

    if (oldHash) {
      const { content } = await objectStore.read(oldHash);
      oldContent = content.toString("utf-8");
    }

    if (newHash) {
      const { content } = await objectStore.read(newHash);
      newContent = content.toString("utf-8");
    }

    // Generate diff
    const patch = createTwoFilesPatch(
      `a/${file}`,
      `b/${file}`,
      oldContent,
      newContent,
    );

    console.log(patch);
  }
}

async function buildTreeFromWorkspace(
  workspace: Workspace,
  objectStore: ObjectStore,
): Promise<string> {
  // Simplified - would need to create blobs and trees
  throw new Error("Not implemented");
}

async function getFilesFromTree(
  treeManager: TreeManager,
  treeHash: string,
  basePath: string = "",
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const tree = await treeManager.readTree(treeHash);

  for (const entry of tree.entries) {
    const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.mode === "040000") {
      // Directory
      const subFiles = await getFilesFromTree(
        treeManager,
        entry.hash,
        fullPath,
      );
      Object.assign(files, subFiles);
    } else {
      // File
      files[fullPath] = entry.hash;
    }
  }

  return files;
}
