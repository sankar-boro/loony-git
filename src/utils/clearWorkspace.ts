import { Workspace } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { removeEmptyDirectories, getTrackedFiles } from "../utils";

export async function clearWorkspace(
  repoPath: string,
  workspace: Workspace,
): Promise<void> {
  // Get all tracked files from index or HEAD
  const trackedFiles = await getTrackedFiles(repoPath);

  // Remove tracked files from workspace
  for (const file of trackedFiles) {
    const fullPath = path.join(repoPath, file);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  // Also remove empty directories (optional)
  await removeEmptyDirectories(repoPath);
}
