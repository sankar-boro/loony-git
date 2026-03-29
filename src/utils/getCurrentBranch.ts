import * as fs from "fs/promises";
import { HEAD } from "../paths";

export async function getCurrentBranch(
  repoPath: string,
): Promise<string | null> {
  try {
    const headRef = (await fs.readFile(HEAD, "utf-8")).trim();
    if (headRef.startsWith("ref: ")) {
      return headRef.slice(16); // Remove 'refs/heads/'
    }
    return null;
  } catch (error) {
    return null;
  }
}
