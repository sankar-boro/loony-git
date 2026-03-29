import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { repoPath } from "../paths";
import { listFiles } from "../utils";

export class Workspace {
  private rootPath: string;

  constructor() {
    this.rootPath = repoPath;
  }

  async listFiles(): Promise<string[]> {
    return await listFiles(this.rootPath);
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

  async hashFile(filePath: string): Promise<string> {
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
