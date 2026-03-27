const { promises: fs } = require("fs");
const path = require("path");
const { inflate } = require("zlib");
const { promisify } = require("util");

const inflateAsync = promisify(inflate);

async function readObject(objectsPath, hash) {
  const objectDir = path.join(objectsPath, hash.slice(0, 2));
  const objectPath = path.join(objectDir, hash.slice(2));

  // Read compressed bytes
  const compressed = await fs.readFile(objectPath);

  // Decompress
  const storeBuffer = await inflateAsync(compressed);
  return {
    buffer: storeBuffer,
  };
}

function getHash() {
  const [, , rootHash] = process.argv;

  if (!rootHash) {
    console.log("👉 Example:");
    console.log("   node run.js <tree-hash>");
    console.log("   node run.js 85d4c50e6193d5b910be05160936e0e1be467bfb\n");
    process.exit(1);
  }

  return rootHash;
}

// Example usage:
(async () => {
  const hash = getHash();
  const obj = await readObject(".loonygit/objects", hash);
  console.log(obj.buffer.toString());
})();
