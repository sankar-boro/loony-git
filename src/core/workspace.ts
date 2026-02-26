import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { loonyignorePath, repoPath } from "../paths";
import { Ignore } from "../core/ignore";

export interface FileStatus {
  path: string;
  status: "untracked" | "modified" | "deleted" | "added" | "unmodified";
}

export class Workspace {
  private loonyignore: Ignore;
  private rootPath: string;

  constructor() {
    this.rootPath = repoPath;
    this.loonyignore = new Ignore();
  }

  private isIgnored(filePath: string): boolean {
    const relativePath = path.relative(this.rootPath, filePath);
    return this.loonyignore.ignores(relativePath);
  }

  async listFiles(): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Check loonyignore
        if (this.isIgnored(fullPath)) continue;

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          files.push(path.relative(this.rootPath, fullPath));
        }
      }
    };

    await walk(this.rootPath);
    return files;
  }

  async readFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.rootPath, filePath);
    return await fs.readFile(fullPath);
  }

  // async fileHash(filePath: string): Promise<string> {
  // const content = await this.readFile(filePath);
  // return createHash("sha1").update(content).digest("hex");
  // }

  async fileHash(filePath: string): Promise<string> {
    const data = await this.readFile(filePath);
    const header = `blob ${data.length}\0`;
    const storeBuffer = Buffer.concat([Buffer.from(header, "utf-8"), data]);

    return createHash("sha1").update(storeBuffer).digest("hex");
  }

  async writeFile(filePath: string, content: Buffer): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    await fs.unlink(fullPath);
  }
}
