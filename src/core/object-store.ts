import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { deflate, inflate } from "zlib";
import { promisify } from "util";
import { Hash } from "./types";
import { objectsPath } from "../paths";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export class ObjectStore {
  private objectsPath: string;

  constructor() {
    this.objectsPath = objectsPath;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.objectsPath, { recursive: true });
  }

  async store(data: Buffer, type: string): Promise<Hash> {
    // Create header: "blob <size>\0<content>"
    const header = `${type} ${data.length}\0`;
    const storeBuffer = Buffer.concat([Buffer.from(header, "utf-8"), data]);

    // Calculate hash
    const hash = createHash("sha1").update(storeBuffer).digest("hex");

    // Compress
    const compressed = await deflateAsync(storeBuffer);

    // Store in objects directory
    const objectDir = path.join(this.objectsPath, hash.slice(0, 2));
    const objectPath = path.join(objectDir, hash.slice(2));

    await fs.mkdir(objectDir, { recursive: true });
    await fs.writeFile(objectPath, compressed);

    return hash;
  }

  async read(hash: Hash): Promise<{ type: string; content: Buffer }> {
    const objectPath = path.join(
      this.objectsPath,
      hash.slice(0, 2),
      hash.slice(2),
    );
    const compressed = await fs.readFile(objectPath);
    const decompressed = await inflateAsync(compressed);

    // Find the null byte separator
    const nullIndex = decompressed.indexOf(0);
    const header = decompressed.slice(0, nullIndex).toString("utf-8");
    const [type] = header.split(" ");

    return {
      type,
      content: decompressed.slice(nullIndex + 1),
    };
  }

  async readObject(hash: Hash): Promise<{ type: string; content: Buffer }> {
    const objectPath = path.join(
      this.objectsPath,
      hash.slice(0, 2),
      hash.slice(2),
    );
    const compressed = await fs.readFile(objectPath);
    const decompressed = await inflateAsync(compressed);

    // Find the null byte separator
    const nullIndex = decompressed.indexOf(0);
    const header = decompressed.slice(0, nullIndex).toString("utf-8");
    const [type] = header.split(" ");

    return {
      type,
      content: decompressed.slice(nullIndex + 1),
    };
  }
}

class MockObjectStore {
  private mapstore: Map<Hash, { type: string; content: Buffer }>;

  constructor() {
    this.mapstore = new Map();
  }

  async store(content: Buffer, type: string): Promise<Hash> {
    const hash = createHash("sha1")
      .update(type + "\0" + content)
      .digest("hex");

    this.mapstore.set(hash, { type, content });
    return hash;
  }

  async read(hash: string): Promise<{ type: string; content: Buffer }> {
    const obj = this.mapstore.get(hash);
    if (!obj) throw new Error(`Object not found: ${hash}`);
    return obj;
  }
}
