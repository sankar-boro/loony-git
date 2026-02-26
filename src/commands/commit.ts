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

/**
 * Creates a new commit from the current staging area (index).
 *
 * This function mirrors the behavior of `git commit`:
 * 1. Loads configuration to determine the commit author
 * 2. Reads the staging area (index)
 * 3. Builds a tree object representing the directory structure
 * 4. Creates a commit object pointing to that tree and its parent
 * 5. Updates HEAD to point to the new commit
 * 6. Updates the index to reflect the committed state
 *
 * @param repoPath - Absolute path to the repository root
 * @param message - Commit message
 * @param author - Optional override for commit author (name + email)
 */
export async function commitCommand(
  repoPath: string,
  message: string,
  author?: { name: string; email: string },
): Promise<void> {
  /**
   * Initialize core Git-like infrastructure:
   * - ObjectStore: persistent storage for blobs, trees, commits
   * - Workspace: working directory abstraction
   * - Index: staging area (files added via `add`)
   * - Managers: helpers to create domain objects
   */
  const config = new Config();
  const objectStore = new ObjectStore();
  const workspace = new Workspace();
  const index = new Index(repoPath);
  const commitManager = new CommitManager(objectStore);
  const treeManager = new TreeManager(objectStore);
  const blobManager = new BlobManager(objectStore);

  /**
   * Load all config files (local, global, system).
   * If no author was provided explicitly, read user.name and user.email
   * from config. Abort if missing.
   */
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

  /**
   * Load the staging area (index) from disk.
   * The index represents all files that have been added for commit.
   */
  await index.load();

  /**
   * If nothing is staged, there's nothing to commit.
   * This matches Git’s "nothing to commit" behavior.
   */
  if (index.getAll().length === 0) {
    console.log("Nothing to commit (no files staged)");
    return;
  }

  /**
   * Convert index entries into a structure suitable for tree construction.
   * Each entry maps a file path to:
   *  - its blob hash
   *  - its file mode (executable or normal file)
   */
  const entries = new Map<
    string,
    { hash: string; mode: "100644" | "100755" }
  >();

  for (const entry of index.getAll()) {
    entries.set(entry.path, {
      hash: entry.hash,
      mode: entry.mode as "100644" | "100755",
    });
  }

  /**
   * Build a tree object from the staged file paths.
   * This creates a hierarchical snapshot of the directory structure.
   * The resulting tree hash represents the entire repository state.
   */
  const tree = await treeManager.buildTreeFromPath(entries);

  /**
   * Resolve the current HEAD reference.
   * HEAD usually points to a branch reference (e.g. refs/heads/main),
   * which in turn contains the hash of the latest commit.
   */
  const headRef = (await fs.readFile(headPath, "utf-8")).trim();
  let parents: string[] = [];

  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    try {
      const parentHash = await fs.readFile(refPath, "utf-8");
      parents = [parentHash.trim()];
    } catch {
      /**
       * No parent commit exists yet.
       * This means we are creating the first commit in the repository.
       */
    }
  }

  /**
   * Create a new commit object.
   * The commit references:
   *  - the root tree hash
   *  - zero or more parent commits
   *  - author metadata
   *  - commit message
   */
  const commit = await commitManager.createCommit(
    tree.hash,
    parents,
    authorInfo,
    message,
  );

  /**
   * Update the branch reference that HEAD points to,
   * so that HEAD now points at the newly created commit.
   */
  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    await fs.writeFile(refPath, commit.hash);
  }

  /**
   * Update the index to reflect the committed state.
   * This marks files as clean and records:
   *  - current blob hash
   *  - file mode
   *  - size and modification time
   *
   * This allows future status checks to detect changes correctly.
   */
  const workspaceFiles = await workspace.listFiles();

  for (const file of workspaceFiles) {
    const indexEntry = index.get(file);
    if (indexEntry) {
      const content = await workspace.readFile(file);
      const hash = await blobManager.createBlob(content);

      const stats = await fs.stat(path.join(repoPath, file));
      const mode = stats.mode & 0o111 ? "100755" : "100644";

      index.add({
        hash: hash.hash,
        mode,
        path: file,
        stage: 0,
        mtime: stats.mtimeMs,
        size: stats.size,
      });
    }
  }

  /**
   * Persist the updated index to disk.
   */
  await index.save();

  /**
   * Print commit summary in Git-style format.
   */
  console.log(`[${commit.hash.slice(0, 7)}] ${message}`);
}
