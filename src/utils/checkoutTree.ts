import { ObjectStore, CommitManager, TreeManager, Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { headPath, branchesPath, indexPath } from "../paths";

export async function checkoutTree(
  repoPath: string,
  treeHash: string,
  treeManager: TreeManager,
  workspace: Workspace,
): Promise<void> {
  const checkoutRecursive = async (treeHash: string, basePath: string = "") => {
    const tree = await treeManager.readTree(treeHash);

    for (const entry of tree.entries) {
      const fullPath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.mode === "040000") {
        // Directory
        await fs.mkdir(path.join(repoPath, fullPath), { recursive: true });
        await checkoutRecursive(entry.hash, fullPath);
      } else {
        // File
        const { content } = await treeManager.objectStore.read(entry.hash);

        // Ensure parent directory exists
        const parentDir = path.dirname(path.join(repoPath, fullPath));
        await fs.mkdir(parentDir, { recursive: true });

        // Write file with appropriate mode
        await fs.writeFile(path.join(repoPath, fullPath), content);

        // Set file permissions based on mode
        const mode = parseInt(entry.mode, 8);
        await fs.chmod(path.join(repoPath, fullPath), mode);
      }
    }
  };

  await checkoutRecursive(treeHash);
}
