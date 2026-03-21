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
    log.section("Usage");
    log.warn("Missing root tree hash.");
    console.log("👉 Example:");
    console.log("   node run.js <tree-hash>");
    console.log("   node run.js 85d4c50e6193d5b910be05160936e0e1be467bfb\n");
    process.exit(1);
  }

  return rootHash;
}

function parseGitTree(buffer) {
  const entries = [];
  let i = buffer.indexOf(0x00) + 1;

  while (i < buffer.length) {
    // Read mode
    let mode = "";
    while (buffer[i] !== 0x20) {
      // space
      mode += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip space

    // Read filename
    let name = "";
    while (buffer[i] !== 0x00) {
      // null byte
      name += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip null byte

    // Read SHA (20 bytes)
    const sha = buffer.slice(i, i + 20).toString("hex");
    i += 20;

    entries.push({
      mode,
      type: mode === "040000" ? "directory" : "file",
      name,
      sha,
    });
  }

  return entries;
}

// Example usage:
(async () => {
  const hash = getHash();
  const obj = await readObject(".loonygit/objects", hash);
  const data = parseGitTree(obj.buffer);
  console.log(data);
})();
