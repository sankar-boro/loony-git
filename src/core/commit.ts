import { ObjectStore } from "./object-store";
import { Hash, Commit } from "../types";

export class CommitManager {
  constructor(private objectStore: ObjectStore) {}

  async createCommit(
    tree: Hash,
    parents: Hash[],
    author: { name: string; email: string },
    message: string,
  ): Promise<Commit> {
    const timestamp = Math.floor(Date.now() / 1000);

    // Build commit content
    const lines: string[] = [
      `tree ${tree}`,
      ...parents.map((p) => `parent ${p}`),
      `author ${author.name} <${author.email}> ${timestamp}`,
      `committer ${author.name} <${author.email}> ${timestamp}`,
      "",
      message,
    ];

    const content = Buffer.from(lines.join("\n"), "utf-8");
    const hash = await this.objectStore.store(content, "commit");

    return {
      type: "commit",
      tree,
      parents,
      author: {
        ...author,
        timestamp,
      },
      message,
      hash,
    };
  }

  async readCommit(hash: Hash): Promise<Commit> {
    const { type, content } = await this.objectStore.read(hash);
    if (type !== "commit") {
      throw new Error(`Object ${hash} is not a commit`);
    }

    const lines = content.toString("utf-8").split("\n");
    let tree: Hash = "";
    const parents: Hash[] = [];
    let author: { name: string; email: string; timestamp: number } | null =
      null;
    let message = "";

    let i = 0;
    // Parse headers
    while (i < lines.length && lines[i] !== "") {
      const line = lines[i];
      if (line.startsWith("tree ")) {
        tree = line.slice(5);
      } else if (line.startsWith("parent ")) {
        parents.push(line.slice(7));
      } else if (line.startsWith("author ")) {
        const match = line.slice(7).match(/(.+) <(.+)> (\d+)/);
        if (match) {
          author = {
            name: match[1],
            email: match[2],
            timestamp: parseInt(match[3], 10),
          };
        }
      }
      i++;
    }

    // Skip empty line
    i++;

    // Rest is message
    message = lines.slice(i).join("\n");

    if (!tree || !author) {
      throw new Error(`Invalid commit object ${hash}`);
    }

    return {
      type: "commit",
      tree,
      parents,
      author,
      message,
      hash,
    };
  }

  async getCommit(hash: Hash) {
    return await this.readCommit(hash);
  }
}
