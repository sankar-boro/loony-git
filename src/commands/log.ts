import { ObjectStore, CommitManager } from "../core";
import * as path from "path";
import * as fs from "fs/promises";
import { getCurrentHash, getHeadRef, getRefPath, headPath } from "../paths";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

export async function logCommand(repoPath: string): Promise<void> {
  const objectStore = new ObjectStore();
  const commitManager = new CommitManager(objectStore);

  const headRef = await getHeadRef();

  let currentHash: string | null = null;
  if (headRef.startsWith("ref: ")) {
    try {
      currentHash = await getCurrentHash();
    } catch {
      console.log("No commits yet");
      return;
    }
  } else {
    currentHash = headRef;
  }

  while (currentHash) {
    const commit = await commitManager.readCommit(currentHash);
    const date = new Date(commit.author.timestamp * 1000);

    console.log(`${bold("commit")} ${green(commit.hash)}`);
    console.log(
      `${bold("Author:")} ${commit.author.name} <${commit.author.email}>`,
    );
    console.log(`${bold("Date:")}   ${dim(date.toLocaleString())}`);
    console.log();
    console.log(`    ${commit.message}`);
    console.log();

    currentHash = commit.parents[0] || null;
  }
}
