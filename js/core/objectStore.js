import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { deflate, inflate } from "zlib";
import { promisify } from "util";
// import { Hash } from "./types";
// import { objectsPath } from "../paths";

const OBJECTS_PATH = process.cwd() + "/.loonygit/objects";
console.log(OBJECTS_PATH);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export const store = async (data, type) => {
  // Create header: "blob <size>\0<content>"
  const header = `${type} ${data.length}\0`;
  const storeBuffer = Buffer.concat([Buffer.from(header, "utf-8"), data]);

  // Calculate hash
  const hash = createHash("sha1").update(storeBuffer).digest("hex");

  // Compress
  const compressed = await deflateAsync(storeBuffer);

  // Store in objects directory
  const objectDir = path.join(OBJECTS_PATH, hash.slice(0, 2));
  const objectPath = path.join(objectDir, hash.slice(2));

  await fs.mkdir(objectDir, { recursive: true });
  await fs.writeFile(objectPath, compressed);

  return hash;
};

export const read = async (hash) => {
  const objectPath = path.join(OBJECTS_PATH, hash.slice(0, 2), hash.slice(2));
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
};

export const readObject = async (hash) => {
  const objectPath = path.join(OBJECTS_PATH, hash.slice(0, 2), hash.slice(2));
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
};
