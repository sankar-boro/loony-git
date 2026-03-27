export { hash } from "./hash";
export { normalizePath } from "./normalizePath";
export { matchesRule } from "./matchesRule";
export { getStats } from "./getStats";
export { parseGitUrl } from "./parseGitUrl";
export { serializeConfig } from "./serializeConfig";
export { deserializeConfig } from "./deserializeConfig";
export { parseValue } from "./parseValue";

import { TreeEntry } from "../core/types";
import { ObjectStore } from "../core";
import { parseTree } from "./parseTree";

export function getRepoName(url: string): string | null {
  try {
    const pathname = new URL(url).pathname; // /sankar-boro/hello.git
    const parts = pathname.split("/").filter(Boolean); // ["sankar-boro", "hello.git"]
    const repoWithGit = parts.pop(); // "hello.git"
    return repoWithGit?.replace(/\.git$/, "") ?? null; // "hello"
  } catch {
    return null;
  }
}

export async function collectObjects(
  objectStore: ObjectStore,
  commitHash: string,
) {
  const visited = new Set<string>();
  const objects: Record<string, { type: string; content: any }> = {};

  async function walk(hash: string) {
    if (visited.has(hash)) return;
    visited.add(hash);

    const obj = await objectStore.readObject(hash);
    objects[hash] = {
      content: obj.content.toString("base64"),
      type: obj.type,
    };

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
