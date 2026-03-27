import * as fs from "fs/promises";
import * as path from "path";
import { Hash } from "../types";
import { objectsPath } from "../paths";
import { writeObject, readObject } from "../utils";

export class ObjectStore {
  objectsPath: string;

  constructor() {
    this.objectsPath = objectsPath;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.objectsPath, { recursive: true });
  }

  async store(data: Buffer, type: string): Promise<Hash> {
    return await writeObject(data, type, this.objectsPath);
  }

  async read(hash: Hash): Promise<{ type: string; content: Buffer }> {
    return await readObject(
      hash,
      path.join(this.objectsPath, hash.slice(0, 2), hash.slice(2)),
    );
  }

  async readObject(hash: Hash): Promise<{ type: string; content: Buffer }> {
    return await this.read(hash);
  }
}
