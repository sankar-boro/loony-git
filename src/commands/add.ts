import { Workspace, ObjectStore, BlobManager, TreeManager } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { indexPath } from "../paths";
import { IndexEntry } from "../core/index";
import { readIndex } from "../read";

export async function addCommand(
  repoPath: string,
  userAddFiles: string[] = ["."],
): Promise<void> {
  const workspace = new Workspace();
  const objectStore = new ObjectStore();
  const blobManager = new BlobManager(objectStore);
  // const treeManager = new TreeManager(objectStore);

  let index: Map<string, IndexEntry> = await readIndex(repoPath);

  const workspaceFiles = await workspace.listFiles();

  // Add files to index
  for (const pattern of userAddFiles) {
    // Simple glob pattern - in real implementation, use a proper glob library
    const matchedFiles = workspaceFiles.filter(
      (f) => f.includes(pattern) || pattern === ".",
    );
    for (const file of matchedFiles) {
      const content = await workspace.readFile(file);
      const blob = await blobManager.createBlob(content);

      // Determine mode (simplified - just check if executable)
      const stats = await fs.stat(path.join(repoPath, file));
      const mode = stats.mode & 0o111 ? "100755" : "100644";

      index.set(file, {
        hash: blob.hash,
        mode,
        path: file,
        stage: 0,
        mtime: stats.mtimeMs,
        size: stats.size,
      });
      console.log(`Added ${file}`);
    }
  }

  // Write index back
  const indexLines = Array.from(index.entries()).map(
    ([filePath, { hash, mode, path, stage, mtime, size }]) =>
      `${hash} ${mode} ${path} ${stage} ${mtime} ${size}`,
  );

  await fs.writeFile(indexPath, indexLines.join("\n"));
}
