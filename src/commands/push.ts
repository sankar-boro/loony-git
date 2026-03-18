import * as path from "path";
import * as fs from "fs/promises";
import fetch from "node-fetch";

import { ObjectStore } from "../core";
import { Config } from "../core/config";
import { headPath } from "../paths";

export async function pushCommand(
  repoPath: string,
  remoteName: string = "origin",
  branch: string = "main",
): Promise<void> {
  const config = new Config();
  const objectStore = new ObjectStore();

  await config.loadAll();

  const remote = await config.listAll();

  if (!remote) {
    console.error(`Remote '${remoteName}' not found`);
    process.exit(1);
  }

  let remoteUrl = null;
  if (remote.remote) {
    if (remote.remote[remoteName]) {
      if (remote.remote[remoteName].url) {
        remoteUrl = remote.remote[remoteName].url;
      }
    }
  }

  const headRef = (await fs.readFile(headPath, "utf-8")).trim();

  if (!headRef.startsWith("ref: ")) {
    console.error("Detached HEAD state. Cannot push.");
    process.exit(1);
  }

  const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));

  let localCommit: string;

  try {
    localCommit = (await fs.readFile(refPath, "utf-8")).trim();
  } catch {
    console.error("No commits to push.");
    process.exit(1);
  }

  console.log(`Pushing ${branch} to ${remoteName} (${remoteUrl})`);

  const objects = await collectObjects(objectStore, localCommit);

  const payload = {
    branch,
    head: localCommit,
    objects,
  };

  const response = await fetch(`${remoteUrl}/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Push failed: ${response.statusText}`);
    process.exit(1);
  }

  console.log(`Push successful.`);
}

async function collectObjects(objectStore: ObjectStore, commitHash: string) {
  const visited = new Set<string>();
  const objects: Record<string, string> = {};

  async function walk(hash: string) {
    if (visited.has(hash)) return;
    visited.add(hash);

    const obj = await objectStore.readObject(hash);
    objects[hash] = obj.content.toString("base64");

    if (obj.type === "commit") {
      const content = obj.content.toString();
      const treeMatch = content.match(/^tree ([a-f0-9]+)/m);
      if (treeMatch) {
        await walk(treeMatch[1]);
      }

      const parentMatches = [...content.matchAll(/^parent ([a-f0-9]+)/gm)];
      for (const p of parentMatches) {
        await walk(p[1]);
      }
    }

    if (obj.type === "tree") {
      const entries = parseTree(obj.content);

      for (const entry of entries) {
        if (entry.hash) {
          await walk(entry.hash);
        }
      }
    }
  }

  await walk(commitHash);

  return objects;
}

export type TreeEntry = {
  mode: string;
  name: string;
  hash: string;
};

export function parseTree(buffer: Buffer): TreeEntry[] {
  const entries: TreeEntry[] = [];
  let i = 0;

  while (i < buffer.length) {
    // read mode
    let mode = "";
    while (buffer[i] !== 0x20) {
      // space
      mode += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip space

    // read filename
    let name = "";
    while (buffer[i] !== 0x00) {
      name += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip null byte

    // read 20 byte hash
    const hashBuffer = buffer.slice(i, i + 20);
    const hash = hashBuffer.toString("hex");
    i += 20;

    entries.push({
      mode,
      name,
      hash,
    });
  }

  return entries;
}
