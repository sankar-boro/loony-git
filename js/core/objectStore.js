import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { deflate, inflate } from "zlib";
import { promisify } from "util";
import { OBJECTS } from "../config.js";

/**
 * Data Samples
 *  1: 0a1b2c3d4e5f6
 */
const compressAsync = promisify(deflate); // compress
const decompressAsync = promisify(inflate); // decompress

/**
 *
 * @param {*} data
 * @param {*} type
 * @returns {string}
 */
export const store = async (data, type) => {
  // "<type> <size>\0<content>"

  const header = `${type} ${data.length}\0`;
  const headerBuffer = Buffer.from(header, "utf-8");
  const storeBuffer = Buffer.concat([headerBuffer, data]);

  // Calculate hash
  const hash = createHash("sha1").update(storeBuffer).digest("hex");

  // Compress
  const compressed = await compressAsync(storeBuffer);

  // Store in objects directory
  const objectDir = path.join(OBJECTS, hash.slice(0, 2)); // .loonygit/objects/01
  const objectPath = path.join(objectDir, hash.slice(2)); // .loonygit/objects/01/1b2c3d4e5f6

  await fs.mkdir(objectDir, { recursive: true });
  await fs.writeFile(objectPath, compressed);

  return hash;
};

export const read = async (hash) => {
  // "<type> <size>\0<content>"

  const objectDir = path.join(OBJECTS, hash.slice(0, 2)); // .loonygit/objects/01
  const objectPath = path.join(objectDir, hash.slice(2)); // .loonygit/objects/01/1b2c3d4e5f6

  const compressed = await fs.readFile(objectPath);
  const decompressed = await decompressAsync(compressed);

  // Find the null byte separator
  const nullIndex = decompressed.indexOf(0);
  const header = decompressed.subarray(0, nullIndex).toString("utf-8");
  const [type, size] = header.split(" ");

  return {
    type,
    size,
    content: decompressed.subarray(nullIndex + 1),
  };
};

export const readObjectHashFile = read;
export const storeObjectHashFile = store;
