import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { promisify } from "util";
import { deflate } from "zlib";

import { Hash } from "../types";

const deflateAsync = promisify(deflate);

export async function writeObject(
  data: Buffer,
  type: string,
  writePath: string,
): Promise<Hash> {
  // Create header: "blob <size>\0<content>"
  const header = `${type} ${data.length}\0`;
  const storeBuffer = Buffer.concat([Buffer.from(header, "utf-8"), data]);

  // Calculate hash
  const hash = createHash("sha1").update(storeBuffer).digest("hex");

  // Compress
  const compressed = await deflateAsync(storeBuffer);

  // Store in objects directory
  const objectDir = path.join(writePath, hash.slice(0, 2));
  const objectPath = path.join(objectDir, hash.slice(2));

  await fs.mkdir(objectDir, { recursive: true });
  await fs.writeFile(objectPath, compressed);

  return hash;
}
