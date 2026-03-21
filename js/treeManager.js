/**
 * Create a tree object from entries and store it.
 * Entries are sorted to ensure deterministic hashing (Git behavior).
 */
async function createTree(objectStore, entries) {
  // Ensure stable ordering for consistent hashes
  const sortedEntries = [...entries].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  /**
   * Encode entries using Git tree format:
   *   <mode> <name>\0<20-byte raw hash>
   */
  const content = Buffer.concat(
    sortedEntries.map((entry) =>
      Buffer.concat([
        Buffer.from(entry.mode, "utf-8"),
        Buffer.from(" "),
        Buffer.from(entry.name, "utf-8"),
        Buffer.from([0]), // null terminator
        Buffer.from(entry.hash, "hex"), // raw 20-byte hash
      ]),
    ),
  );

  // Store and return content-addressed tree
  const hash = await objectStore.store(content, "tree");
  return { type: "tree", entries: sortedEntries, hash };
}

/**
 * Read a tree object and decode it into structured entries.
 */
async function readTree(objectStore, hash) {
  const { type, content } = await objectStore.read(hash);

  if (type !== "tree") {
    throw new Error(`Object ${hash} is not a tree`);
  }

  const entries = [];
  let offset = 0;

  /**
   * Parse binary format sequentially:
   *   <mode> <name>\0<20-byte hash>
   */
  while (offset < content.length) {
    // Extract mode (ends at space)
    const modeEnd = content.indexOf(32, offset);
    const mode = content.slice(offset, modeEnd).toString("utf-8");

    // Extract name (ends at null byte)
    const nameStart = modeEnd + 1;
    const nameEnd = content.indexOf(0, nameStart);
    const name = content.slice(nameStart, nameEnd).toString("utf-8");

    // Extract 20-byte hash
    const hashStart = nameEnd + 1;
    const entryHash = content.slice(hashStart, hashStart + 20).toString("hex");

    entries.push({ mode, name, hash: entryHash });

    // Move to next entry
    offset = hashStart + 20;
  }

  return { type: "tree", entries, hash };
}

/**
 * Build a full directory tree from flat file paths.
 *
 * Example:
 *   src/app.js → blob
 *   src/util.js → blob
 *   README.md → blob
 */
async function buildTreeFromPath(objectStore, entries) {
  /**
   * Map:
   *   dirPath → (fileName → {hash, mode})
   * Root directory is represented as ""
   */
  const treeMap = new Map();

  for (const [filePath, value] of entries) {
    const parts = filePath.split("/");
    const fileName = parts.pop();
    const dirPath = parts.join("/");

    if (!treeMap.has(dirPath)) treeMap.set(dirPath, new Map());
    treeMap.get(dirPath).set(fileName, value);
  }

  // Cache subtree hashes to avoid recomputation
  const cache = new Map();

  /**
   * Recursively build tree for a directory
   */
  const build = async (dir) => {
    if (cache.has(dir)) return cache.get(dir);

    const treeEntries = [];

    // Add files directly inside this directory
    const files = treeMap.get(dir);
    if (files) {
      for (const [name, value] of files) {
        treeEntries.push({ name, ...value });
      }
    }

    /**
     * Discover immediate child directories
     * Example:
     *   dir = "src"
     *   keys = ["src/utils", "src/lib/core"]
     *   → subdirs = ["utils", "lib"]
     */
    const prefix = dir ? dir + "/" : "";
    const subdirs = new Set();

    for (const key of treeMap.keys()) {
      if (!key.startsWith(prefix) || key === dir) continue;

      const rest = key.slice(prefix.length);
      subdirs.add(rest.split("/")[0]);
    }

    // Recursively build subtrees
    for (const subdir of subdirs) {
      const subPath = dir ? `${dir}/${subdir}` : subdir;
      const subHash = await build(subPath);

      treeEntries.push({
        name: subdir,
        mode: "040000", // directory
        hash: subHash,
      });
    }

    // Store this directory as a tree object
    const tree = await createTree(objectStore, treeEntries);
    cache.set(dir, tree.hash);

    return tree.hash;
  };

  // Build root tree and return parsed structure
  const rootHash = await build("");
  return readTree(objectStore, rootHash);
}

/**
 * Flatten a tree into:
 *   filePath → blob hash
 *
 * Useful for diffing, status checks, etc.
 */
async function flattenTree(objectStore, hash, prefix = "", out = new Map()) {
  const tree = await readTree(objectStore, hash);

  for (const entry of tree.entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.mode === "040000") {
      // Recurse into subdirectory
      await flattenTree(objectStore, entry.hash, fullPath, out);
    } else {
      // Leaf file
      out.set(fullPath, entry.hash);
    }
  }

  return out;
}

module.exports = {
  createTree,
  readTree,
  buildTreeFromPath,
  flattenTree,
};
