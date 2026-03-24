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

  const nullIndex = storeBuffer.indexOf(0);
  const firstLine = storeBuffer.indexOf("\n");

  const header = storeBuffer.subarray(0, nullIndex).toString("utf-8");
  const treeAndHash = storeBuffer
    .subarray(nullIndex + 1, firstLine)
    .toString("utf-8");
  const [, treeHash] = treeAndHash.split(" ");
  const content = storeBuffer.subarray(nullIndex + 1);

  const [type, sizeStr] = header.split(" ");
  const size = Number(sizeStr);
  return {
    dataAsString: content.toString(),
    type,
    size,
    tree: treeHash,
  };
}

async function readObjectFromHash(objectsPath, hash) {
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

function parseGitTree(buffer) {
  const entries = [];
  let i = buffer.indexOf(0x00) + 1;

  let stringValue = "";

  while (i < buffer.length) {
    // Read mode
    let mode = "";
    while (buffer[i] !== 0x20) {
      mode += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip space

    // Read filename
    let name = "";
    while (buffer[i] !== 0x00) {
      name += String.fromCharCode(buffer[i]);
      i++;
    }
    i++; // skip null byte

    // Read SHA (20 bytes)
    const sha = buffer.slice(i, i + 20).toString("hex");
    i += 20;

    // ✅ Build clean readable line
    stringValue += `${mode} ${name} ${sha}\n`;

    entries.push({
      mode,
      type: mode === "040000" ? "directory" : "file",
      name,
      sha,
    });
  }

  return {
    entries,
    stringValue,
  };
}

// Example usage:
(async () => {
  const HEAD = await readHEAD(process.cwd());
  const data = await readObject(
    path.join(process.cwd(), ".loonygit", "objects"),
    HEAD,
  );
  const treeData = await readObjectFromHash(
    path.join(process.cwd(), ".loonygit", "objects"),
    data.tree,
  );
  const parsedTreeData = await parseGitTree(treeData.buffer);
  //   console.log(data.dataAsString);
  //   console.log(data.type, data.size);
  console.log(data);
  console.log(parsedTreeData.stringValue);
})();
