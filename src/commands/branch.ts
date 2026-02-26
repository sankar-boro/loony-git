import * as path from "path";
import * as fs from "fs/promises";
import { headPath, branchesPath } from "../paths";

export async function branchCommand(
  repoPath: string,
  branchName?: string,
  options: { delete?: boolean; list?: boolean } = {},
): Promise<void> {
  if (options.delete && branchName) {
    // Delete branch
    const branchPath = path.join(branchesPath, branchName);
    await fs.unlink(branchPath);
    console.log(`Deleted branch ${branchName}`);
  } else if (branchName) {
    // Create branch
    const headRef = (await fs.readFile(headPath, "utf-8")).trim();

    let currentCommit: string;
    if (headRef.startsWith("ref: ")) {
      const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
      currentCommit = (await fs.readFile(refPath, "utf-8")).trim();
    } else {
      currentCommit = headRef;
    }

    const branchPath = path.join(branchesPath, branchName);
    await fs.writeFile(branchPath, currentCommit);
    console.log(`Created branch ${branchName}`);
  } else {
    // List branches
    const branches = await fs.readdir(branchesPath);

    // Get current branch
    const headRef = (await fs.readFile(headPath, "utf-8")).trim();
    let currentBranch = "";
    if (headRef.startsWith("ref: ")) {
      currentBranch = headRef.slice(16); // Remove 'refs/heads/'
    }

    for (const branch of branches.sort()) {
      const prefix = branch === currentBranch ? "* " : "  ";
      console.log(`${prefix}${branch}`);
    }
  }
}
