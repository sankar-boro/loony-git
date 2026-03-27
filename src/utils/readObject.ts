import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";
import { inflate } from "zlib";

import { Hash } from "../types";

const inflateAsync = promisify(inflate);

export async function readObject(
  hash: Hash,
  objectDir: string,
): Promise<{ type: string; content: Buffer }> {
  const objectPath = path.join(objectDir, hash.slice(0, 2), hash.slice(2));
  const compressed = await fs.readFile(objectPath);
  const decompressed = await inflateAsync(compressed);

  // Find the null byte separator
  const nullIndex = decompressed.indexOf(0);
  const header = decompressed.subarray(0, nullIndex).toString("utf-8");
  const [type] = header.split(" ");

  return {
    type,
    content: decompressed.subarray(nullIndex + 1),
  };
}
