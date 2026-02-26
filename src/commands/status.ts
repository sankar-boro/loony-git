import { Workspace, ObjectStore } from "../core";
import { TreeManager } from "../core/tree";
import * as path from "path";
import * as fs from "fs/promises";
import { headPath, indexPath, repoPath } from "../paths";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

export async function statusCommand(): Promise<void> {
  const workspace = new Workspace();
  const objectStore = new ObjectStore();
  const treeManager = new TreeManager(objectStore);

  const index = new Map<string, string>();
  try {
    const indexContent = await fs.readFile(indexPath, "utf-8");
    for (const line of indexContent.split("\n").filter(Boolean)) {
      const [hash, mode, filePath] = line.split(" ");
      index.set(filePath, hash);
    }
  } catch {}

  let headCommit: string | null = null;
  try {
    const headRef = (await fs.readFile(headPath, "utf-8")).trim();
    if (headRef.startsWith("ref: ")) {
      const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
      headCommit = (await fs.readFile(refPath, "utf-8")).trim();
    } else {
      headCommit = headRef;
    }
  } catch {}

  let headFiles = new Map<string, string>();
  if (headCommit) {
    const { content } = await objectStore.read(headCommit);
    const nullIdx = content.indexOf(0);
    const body = content.slice(nullIdx + 1).toString("utf-8");
    const treeHash = body.split("\n")[0].split(" ")[1];
    headFiles = await treeManager.flattenTree(treeHash);
  }

  const workspaceFiles = new Set(await workspace.listFiles());

  const staged: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];

  // HEAD ↔ index (staged)
  for (const [filePath, hash] of index) {
    const headHash = headFiles.get(filePath);
    if (!headHash) staged.push(`new file:   ${filePath}`);
    else if (headHash !== hash) staged.push(`modified:   ${filePath}`);
  }

  for (const filePath of headFiles.keys()) {
    if (!index.has(filePath)) staged.push(`deleted:    ${filePath}`);
  }

  // index ↔ workspace
  for (const [filePath, hash] of index) {
    if (!workspaceFiles.has(filePath)) {
      deleted.push(filePath);
    } else {
      const currentHash = await workspace.fileHash(filePath);
      if (currentHash !== hash) modified.push(filePath);
    }
  }

  // workspace ↔ index
  for (const file of workspaceFiles) {
    if (!index.has(file)) untracked.push(file);
  }

  console.log(bold(`On branch ${await getCurrentBranch(repoPath)}`));
  console.log(
    headCommit ? `HEAD at ${headCommit.slice(0, 7)}` : "No commits yet",
  );

  if (staged.length) {
    console.log(bold("\nChanges to be committed:"));
    staged.forEach((line) => console.log("  " + green(line)));
  }

  if (modified.length) {
    console.log(bold("\nChanges not staged for commit:"));
    modified.forEach((f) => console.log("  " + red(`modified:   ${f}`)));
  }

  if (deleted.length) {
    console.log(bold("\nDeleted files:"));
    deleted.forEach((f) => console.log("  " + red(`deleted:    ${f}`)));
  }

  if (untracked.length) {
    console.log(bold("\nUntracked files:"));
    untracked.forEach((f) => console.log(`  ${f}`));
  }

  if (
    !staged.length &&
    !modified.length &&
    !deleted.length &&
    !untracked.length
  ) {
    console.log("\nWorking tree clean");
  }
}

async function getCurrentBranch(repoPath: string): Promise<string> {
  const headRef = (await fs.readFile(headPath, "utf-8")).trim();
  if (headRef.startsWith("ref: refs/heads/")) {
    return headRef.replace("ref: refs/heads/", "");
  }
  return "detached HEAD";
}
