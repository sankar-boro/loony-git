import * as path from "path";
import * as fs from "fs/promises";
import { HEAD, Heads } from "../paths";

export async function branchCommand(
  repoPath: string,
  branchName?: string,
  options: { delete?: boolean; list?: boolean } = {},
): Promise<void> {
  if (options.delete && branchName) {
    // Delete branch
    const branchPath = path.join(Heads, branchName);
    await fs.unlink(branchPath);
    console.log(`Deleted branch ${branchName}`);
  } else if (branchName) {
    // Create branch
    const headRef = (await fs.readFile(HEAD, "utf-8")).trim();

    let currentCommit: string; // 0a1b2c3d4e5f
    if (headRef.startsWith("ref: ")) {
      const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
      currentCommit = (await fs.readFile(refPath, "utf-8")).trim();
    } else {
      currentCommit = headRef;
    }

    const branchPath = path.join(Heads, branchName);
    await fs.writeFile(branchPath, currentCommit); // refs/heads/dev -> 0a1b2c3d4e5f
    console.log(`Created branch ${branchName}`);
  } else {
    // List branches
    const branches = await fs.readdir(Heads);

    // Get current branch
    const headRef = (await fs.readFile(HEAD, "utf-8")).trim();
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
