import { ObjectStore } from "./object-store";
import { Hash, Blob } from "./types";

export class BlobManager {
  constructor(private objectStore: ObjectStore) {}

  async createBlob(content: Buffer): Promise<Blob> {
    const hash = await this.objectStore.store(content, "blob");
    return {
      type: "blob",
      content,
      hash,
    };
  }

  async readBlob(hash: Hash): Promise<Blob> {
    const { type, content } = await this.objectStore.read(hash);
    if (type !== "blob") {
      throw new Error(`Object ${hash} is not a blob`);
    }
    return {
      type: "blob",
      content,
      hash,
    };
  }
}
