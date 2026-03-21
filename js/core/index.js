import fs from "fs/promises";
export default class Index {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.entries = new Map();
    this.dirty = false;
    this.indexPath = this.repoPath + "/.loonygit/" + "index";
    console.log(this.repoPath, this.indexPath);
  }
  async load() {
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
      console.log(error);
      // Index doesn't exist yet
    }
  }
  async save() {
    if (!this.dirty) return;
    const lines = Array.from(this.entries.values()).map(
      (entry) =>
        `${entry.hash} ${entry.mode} ${entry.path} ${entry.stage} ${entry.mtime} ${entry.size}`,
    );
    await fs.writeFile(this.indexPath, lines.join("\n"));
    this.dirty = false;
  }
  add(entry) {
    this.entries.set(entry.path, entry);
    this.dirty = true;
  }
  remove(path) {
    this.entries.delete(path);
    this.dirty = true;
  }
  get(path) {
    return this.entries.get(path);
  }
  getAll() {
    return Array.from(this.entries.values());
  }
  clear() {
    this.entries.clear();
    this.dirty = true;
  }
  async updateFromWorkspace(workspace, objectStore) {
    const workspaceFiles = await workspace.listFiles();
    const newEntries = new Map();
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
  async refresh() {
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
  async compareWithWorkspace(workspace) {
    const workspaceFiles = new Set(await workspace.listFiles());
    const modified = [];
    const deleted = [];
    const added = [];
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
}

export { Index };
