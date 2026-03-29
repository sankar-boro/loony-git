import { ObjectStore } from "./object-store";
import { Hash, Tree, TreeEntry } from "../types";

/**
 * TreeManager is responsible for creating, reading, and traversing tree objects.
 *
 * A "tree" represents a directory snapshot in a Git-like object model:
 * - Files are stored as blob hashes
 * - Directories are stored as tree hashes
 * - A tree is immutable and content-addressed
 *
 * Tree object binary format (mirrors Git's internal format):
 *   <mode> <name>\0<20-byte hash>
 *   <mode> <name>\0<20-byte hash>
 *   ...
 *
 * Example:
 *   100644 file.txt\0<blob-hash>
 *   040000 src\0<tree-hash>
 */
export class TreeManager {
  objectStore: ObjectStore;

  constructor(objectStore: ObjectStore) {
    this.objectStore = objectStore;
  }

  /**
   * Creates and stores a tree object from a list of entries.
   *
   * The entries are sorted by name to guarantee deterministic hashing.
   * Deterministic ordering ensures identical directory contents
   * always produce the same tree hash.
   *
   * @param entries - Files and subdirectories belonging to this tree
   * @returns The stored tree object including its content hash
   */
  async createTree(entries: TreeEntry[]): Promise<Tree> {
    const sortedEntries = [...entries].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    /**
     * Encode tree entries using Git-compatible binary format:
     *   <mode> <name>\0<hash-bytes>
     */
    const content = Buffer.concat(
      sortedEntries.map((entry) =>
        Buffer.concat([
          Buffer.from(entry.mode, "utf-8"),
          Buffer.from(" "),
          Buffer.from(entry.name, "utf-8"),
          Buffer.from([0]), // null byte separator
          Buffer.from(entry.hash, "hex"), // 20 raw bytes
        ]),
      ),
    );

    /**
     * Store the tree object in the object store.
     * The returned hash uniquely identifies this directory snapshot.
     */
    const hash = await this.objectStore.store(content, "tree");

    return { type: "tree", entries: sortedEntries, hash };
  }

  /**
   * Reads and parses a tree object from the object store.
   *
   * This reverses the binary tree format back into structured entries.
   *
   * @param hash - Hash of the tree object to read
   * @returns Parsed tree with entries
   */
  async readTree(hash: Hash): Promise<Tree> {
    const { type, content } = await this.objectStore.read(hash);
    if (type !== "tree") {
      throw new Error(`Object ${hash} is not a tree`);
    }

    const entries: TreeEntry[] = [];
    let offset = 0;

    /**
     * Parse binary tree format:
     *   <mode> <name>\0<20-byte hash>
     * Repeat until end of buffer.
     */
    while (offset < content.length) {
      const modeEnd = content.indexOf(32, offset); // space
      const mode = content
        .subarray(offset, modeEnd)
        .toString("utf-8") as TreeEntry["mode"];

      const nameStart = modeEnd + 1;
      const nameEnd = content.indexOf(0, nameStart); // null byte
      const name = content.subarray(nameStart, nameEnd).toString("utf-8");

      const hashStart = nameEnd + 1;
      const hash = content.subarray(hashStart, hashStart + 20).toString("hex");

      entries.push({ mode, name, hash });
      offset = hashStart + 20;
    }

    return { type: "tree", entries, hash };
  }

  async getTree(hash: Hash): Promise<Tree> {
    return await this.readTree(hash);
  }

  /**
   * Builds a full tree hierarchy from flat file paths.
   *
   * Example input:
   *   src/app.ts -> blobHash1
   *   src/utils.ts -> blobHash2
   *   README.md -> blobHash3
   *
   * Output:
   *   root tree
   *    ├── src (tree)
   *    │    ├── app.ts
   *    │    └── utils.ts
   *    └── README.md
   *
   * @param entries - Map of file paths to blob hashes and modes
   * @returns Root tree object
   */
  async buildTreeFromPath(
    entries: Map<string, { hash: Hash; mode: TreeEntry["mode"] }>,
  ): Promise<Tree> {
    /**
     * Group files by their directory path.
     * "" represents the repository root.
     */
    const treeMap = new Map<
      string,
      Map<string, { hash: Hash; mode: TreeEntry["mode"] }>
    >();

    for (const [filePath, value] of entries) {
      const parts = filePath.split("/");
      const fileName = parts.pop()!;
      const dirPath = parts.join("/"); // "" = root

      if (!treeMap.has(dirPath)) treeMap.set(dirPath, new Map());
      treeMap.get(dirPath)!.set(fileName, value);
    }

    /**
     * Cache already-built trees to avoid rebuilding the same subtree
     * multiple times during recursion.
     */
    const cache = new Map<string, Hash>();

    /**
     * Recursively build a tree for a directory path.
     */
    const build = async (dir: string): Promise<Hash> => {
      if (cache.has(dir)) return cache.get(dir)!;

      const treeEntries: TreeEntry[] = [];

      /**
       * Add file entries belonging directly to this directory.
       */
      const files = treeMap.get(dir);
      if (files) {
        for (const [name, value] of files) {
          treeEntries.push({ name, ...value });
        }
      }

      /**
       * Discover immediate subdirectories of this directory.
       */
      const prefix = dir ? dir + "/" : "";
      const subdirs = new Set<string>();

      for (const key of treeMap.keys()) {
        if (!key.startsWith(prefix) || key === dir) continue;
        const rest = key.slice(prefix.length);
        subdirs.add(rest.split("/")[0]);
      }

      /**
       * Recursively build subtrees and add them as directory entries.
       */
      for (const subdir of subdirs) {
        const subHash = await build(dir ? `${dir}/${subdir}` : subdir);

        treeEntries.push({
          name: subdir,
          mode: "040000", // directory mode
          hash: subHash,
        });
      }

      /**
       * Store the constructed tree and memoize its hash.
       */
      const tree = await this.createTree(treeEntries);
      cache.set(dir, tree.hash);
      return tree.hash;
    };

    /**
     * Build the root tree and return the fully parsed structure.
     */
    const rootHash = await build("");
    return this.readTree(rootHash);
  }

  /**
   * Flattens a tree into a map of file paths → blob hashes.
   *
   * This is useful for:
   * - status comparisons
   * - diffs
   * - detecting changes between commits
   *
   * @param hash - Root tree hash
   * @param prefix - Internal recursion path prefix
   * @param out - Accumulator map of paths to blob hashes
   * @returns Flattened file map
   */
  async flattenTree(
    hash: Hash,
    prefix = "",
    out = new Map<string, Hash>(),
  ): Promise<Map<string, Hash>> {
    const tree = await this.readTree(hash);

    for (const entry of tree.entries) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.mode === "040000") {
        // Recurse into subtrees (directories)
        await this.flattenTree(entry.hash, fullPath, out);
      } else {
        // Leaf file
        out.set(fullPath, entry.hash);
      }
    }

    return out;
  }
}
