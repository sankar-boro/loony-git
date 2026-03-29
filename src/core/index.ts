export * from "../types";
export { ObjectStore } from "./object-store";
export { BlobManager } from "./blob";
export { TreeManager } from "./tree";
export { CommitManager } from "./commit";
export { Workspace } from "./workspace";
export { Config } from "./config";

import * as fs from "fs/promises";
import * as path from "path";
import { Workspace } from "./workspace";
import { ObjectStore } from "./object-store";
import { TreeManager } from "./tree";
import { indexPath } from "../paths";
import { IndexEntry } from "../types";

export class Index {
  private entries: Map<string, IndexEntry> = new Map();
  private indexPath: string;
  private dirty: boolean = false;

  constructor(private repoPath: string) {
    this.indexPath = indexPath;
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, "utf-8");
      const lines = content.split("\n").filter((l) => l);

      for (const line of lines) {
        const [hash, mode, path, stage, mtime, size] = line.split(" ");
        this.entries.set(path, {
          hash,
          mode,
          path,
          stage: parseInt(stage, 10),
          mtime: parseFloat(mtime),
          size: parseInt(size),
        });
      }
    } catch (error) {
      // Index doesn't exist yet
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    const lines = Array.from(this.entries.values()).map(
      (entry) =>
        `${entry.hash} ${entry.mode} ${entry.path} ${entry.stage} ${entry.mtime} ${entry.size}`,
    );
    await fs.writeFile(this.indexPath, lines.join("\n"));
    this.dirty = false;
  }

  add(entry: IndexEntry): void {
    this.entries.set(entry.path, entry);
    this.dirty = true;
  }

  remove(path: string): void {
    this.entries.delete(path);
    this.dirty = true;
  }

  get(path: string): IndexEntry | undefined {
    return this.entries.get(path);
  }

  getAll(): IndexEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
    this.dirty = true;
  }

  async updateFromWorkspace(
    workspace: Workspace,
    objectStore: ObjectStore,
  ): Promise<void> {
    const workspaceFiles = await workspace.listFiles();
    const newEntries = new Map<string, IndexEntry>();

    // Add/update workspace files
    for (const file of workspaceFiles) {
      const content = await workspace.readFile(file);
      const hash = await objectStore.store(content, "blob");

      const stats = await fs.stat(path.join(this.repoPath, file));
      const mode = stats.mode & 0o111 ? "100755" : "100644";

      newEntries.set(file, {
        hash,
        mode,
        path: file,
        stage: 0,
        mtime: stats.mtimeMs,
        size: stats.size,
      });
    }

    this.entries = newEntries;
    this.dirty = true;
  }

  async refresh(): Promise<void> {
    // Update index entries with current file stats without changing hashes
    for (const [filePath, entry] of this.entries) {
      try {
        const fullPath = path.join(this.repoPath, filePath);
        const stats = await fs.stat(fullPath);

        // Update metadata
        entry.mtime = stats.mtimeMs;
        entry.size = stats.size;
        this.dirty = true;
      } catch (error) {
        // File no longer exists, mark as deleted
        // In Git, this would show as "deleted" in status
      }
    }
  }

  async compareWithWorkspace(workspace: Workspace): Promise<{
    modified: string[];
    deleted: string[];
    added: string[];
  }> {
    const workspaceFiles = new Set(await workspace.listFiles());
    const modified: string[] = [];
    const deleted: string[] = [];
    const added: string[] = [];

    // Check tracked files
    for (const [filePath, entry] of this.entries) {
      if (!workspaceFiles.has(filePath)) {
        deleted.push(filePath);
      } else {
        const currentHash = await workspace.fileHash(filePath);
        if (currentHash !== entry.hash) {
          modified.push(filePath);
        }
      }
    }

    // Check untracked files
    for (const file of workspaceFiles) {
      if (!this.entries.has(file)) {
        added.push(file);
      }
    }

    return { modified, deleted, added };
  }

  async updateFromTree(
    treeManager: TreeManager,
    treeHash: string,
  ): Promise<void> {
    this.entries.clear();
    this.dirty = true;

    const addTreeEntries = async (hash: string, basePath = "") => {
      const tree = await treeManager.readTree(hash);

      for (const entry of tree.entries) {
        const fullPath = basePath
          ? path.join(basePath, entry.name)
          : entry.name;

        if (entry.mode === "040000") {
          await addTreeEntries(entry.hash, fullPath);
        } else {
          try {
            const stats = await fs.stat(path.join(this.repoPath, fullPath));
            this.entries.set(fullPath, {
              hash: entry.hash,
              mode: entry.mode,
              path: fullPath,
              stage: 0,
              mtime: stats.mtimeMs,
              size: stats.size,
            });
          } catch (error) {
            // file missing in workspace (should not happen after checkout)
          }
        }
      }
    };

    await addTreeEntries(treeHash);
  }
}
