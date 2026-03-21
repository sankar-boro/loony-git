const { promises: fs } = require("fs");
const path = require("path");
const { inflate } = require("zlib");
const { promisify } = require("util");

const inflateAsync = promisify(inflate);

async function readHEAD(repoPath) {
  const loonygitPath = path.join(repoPath, ".loonygit");
  const headPath = path.join(loonygitPath, "HEAD");
  const headRef = (await fs.readFile(headPath, "utf-8")).trim();
  let parentHash = null;

  if (headRef.startsWith("ref: ")) {
    const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
    parentHash = await fs.readFile(refPath, "utf-8");
  }
  return parentHash;
}

async function readObject(objectsPath, hash) {
  const objectDir = path.join(objectsPath, hash.slice(0, 2));
  const objectPath = path.join(objectDir, hash.slice(2));

  // Read compressed bytes
  const compressed = await fs.readFile(objectPath);

  // Decompress
  const storeBuffer = await inflateAsync(compressed);

  return storeBuffer;
}

// Example usage:
(async () => {
  const HEAD = await readHEAD(process.cwd());
  const data = await readObject(
    path.join(process.cwd(), ".loonygit", "objects"),
    HEAD,
  );
  console.log(HEAD);
  console.log(data.toString());
})();
