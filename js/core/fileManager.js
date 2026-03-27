// import { store, read, exists, deleteObject } from "./objectStore.js";
// import { glob } from "glob";
import { buildTreeFromPath } from "./treeManager.js";
import fs from "fs/promises";
import path from "path";

import { hash } from "../utils/index.js";

/**
 * Reads all files and directories from a given path, respecting ignore patterns
 * @param {string} rootPath - Root directory to read from
 * @param {Object} options - Configuration options
 * @param {string[]} options.ignore - Patterns to ignore (glob patterns)
 * @param {boolean} options.includeDirectories - Whether to include directories
 * @param {boolean} options.includeFiles - Whether to include files
 * @param {boolean} options.absolute - Return absolute paths
 * @returns {Promise<Array<{path: string, stats: fs.Stats, relativePath: string}>>}
 */
async function readAllFilesAndDirectories(rootPath, options = {}) {
  const {
    ignore = [
      ".git",
      "node_modules",
      ".DS_Store",
      "*.log",
      ".loonygit",
      "dist",
    ],
    includeDirectories = true,
    includeFiles = true,
    absolute = false,
  } = options;

  const files = [];
  const root = path.resolve(rootPath);

  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    const relativePath = path.relative(rootPath, fullPath);

    // Check if should ignore
    if (shouldIgnore(relativePath, ignore)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (includeDirectories) {
        files.push({
          path: absolute ? fullPath : relativePath,
          //   stats: await fs.stat(fullPath),
          fullPath,
          relativePath,
        });
      }

      // Recursively read subdirectory
      const subFiles = await readAllFilesAndDirectories(fullPath, {
        ...options,
        absolute,
      });
      files.push(...subFiles);
    } else if (entry.isFile() && includeFiles) {
      files.push({
        path: absolute ? fullPath : relativePath,
        // stats: await fs.stat(fullPath),
        fullPath,
        relativePath,
      });
    }
  }

  return files;
}

/**
 * Checks if a path should be ignored based on patterns
 * @param {string} filePath - Path to check
 * @param {string[]} ignorePatterns - Glob patterns to ignore
 * @returns {boolean}
 */
function shouldIgnore(filePath, ignorePatterns) {
  if (!ignorePatterns || ignorePatterns.length === 0) return false;

  return ignorePatterns.some((pattern) => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  });
}

/**
 * Walks through a directory tree and returns all files matching criteria
 * @param {string} rootPath - Starting directory
 * @param {Object} options - Options for walking
 * @param {RegExp} options.pattern - File pattern to match
 * @param {number} options.maxDepth - Maximum depth to traverse
 * @param {string[]} options.ignore - Patterns to ignore
 * @returns {Promise<string[]>}
 */
async function walkDirectory(rootPath, options = {}) {
  const {
    pattern = /.*/,
    maxDepth = Infinity,
    ignore = [".git", "node_modules"],
  } = options;

  const results = [];

  async function walk(currentPath, depth = 0) {
    if (depth > maxDepth) return;

    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (shouldIgnore(relativePath, ignore)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootPath);
  return results;
}

/**
 * Creates a tree from a directory on disk, respecting ignore patterns
 * @param {string} directoryPath - Path to the directory
 * @param {Object} options - Options for tree creation
 * @param {string[]} options.ignore - Patterns to ignore
 * @param {Function} options.hashFile - Function to hash file content
 * @returns {Promise<Object>} Tree object
 */
async function createTreeFromDirectory(directoryPath, options = {}) {
  const { ignore = [".git", "node_modules", ".DS_Store"], hashFile } = options;

  if (!hashFile) {
    throw new Error("hashFile function is required");
  }

  const entries = new Map();

  async function processDirectory(dirPath, relativePath = "") {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      const fileRelativePath = relativePath
        ? path.join(relativePath, file.name)
        : file.name;

      if (shouldIgnore(fileRelativePath, ignore)) continue;

      if (file.isDirectory()) {
        await processDirectory(fullPath, fileRelativePath);
      } else if (file.isFile()) {
        const content = await fs.readFile(fullPath);
        const hash = await hashFile(content);
        entries.set(fileRelativePath, {
          mode: "100644",
          hash,
        });
      }
    }
  }

  await processDirectory(directoryPath);
  return await buildTreeFromPath(entries);
}

/**
 * Updates a tree by adding or modifying files
 * @param {string} treeHash - Hash of the tree to update
 * @param {Map<string, {mode: string, hash: string}>} updates - Files to add/update
 * @returns {Promise<Object>} Updated tree
 */
async function updateTree(treeHash, updates) {
  const existingFiles = await flattenTree(treeHash);

  // Merge existing files with updates
  for (const [path, hash] of updates) {
    existingFiles.set(path, hash);
  }

  return await buildTreeFromPath(existingFiles);
}

/**
 * Removes files from a tree
 * @param {string} treeHash - Hash of the tree to update
 * @param {string[]} pathsToRemove - Paths to remove
 * @returns {Promise<Object>} Updated tree
 */
// async function removeFromTree(treeHash, pathsToRemove) {
//   const existingFiles = await flattenTree(treeHash);

//   for (const pathToRemove of pathsToRemove) {
//     existingFiles.delete(pathToRemove);
//   }

//   return await buildTreeFromPath(existingFiles);
// }

/**
 * Gets the difference between two trees
 * @param {string} treeHash1 - First tree hash
 * @param {string} treeHash2 - Second tree hash
 * @returns {Promise<{added: Map, removed: Map, modified: Map}>}
 */
async function diffTrees(treeHash1, treeHash2) {
  const files1 = await flattenTree(treeHash1);
  const files2 = await flattenTree(treeHash2);

  const added = new Map();
  const removed = new Map();
  const modified = new Map();

  // Check for added and modified
  for (const [path, hash] of files2) {
    if (!files1.has(path)) {
      added.set(path, hash);
    } else if (files1.get(path) !== hash) {
      modified.set(path, { old: files1.get(path), new: hash });
    }
  }

  // Check for removed
  for (const [path, hash] of files1) {
    if (!files2.has(path)) {
      removed.set(path, hash);
    }
  }

  return { added, removed, modified };
}

/**
 * Filters a tree based on a predicate function
 * @param {string} treeHash - Hash of the tree to filter
 * @param {Function} predicate - Function that returns true to keep the file
 * @returns {Promise<Object>} Filtered tree
 */
async function filterTree(treeHash, predicate) {
  const files = await flattenTree(treeHash);
  const filtered = new Map();

  for (const [path, hash] of files) {
    if (await predicate(path, hash)) {
      filtered.set(path, { mode: "100644", hash });
    }
  }

  return await buildTreeFromPath(filtered);
}

/**
 * Gets the size of a tree (total bytes of all blobs)
 * @param {string} treeHash - Hash of the tree
 * @param {Function} getBlobSize - Function to get blob size from hash
 * @returns {Promise<number>} Total size in bytes
 */
async function getTreeSize(treeHash, getBlobSize) {
  const files = await flattenTree(treeHash);
  let totalSize = 0;

  for (const hash of files.values()) {
    totalSize += await getBlobSize(hash);
  }

  return totalSize;
}

/**
 * Finds files in a tree by name pattern
 * @param {string} treeHash - Hash of the tree
 * @param {RegExp} pattern - Pattern to match file names
 * @returns {Promise<Map<string, string>>} Map of paths to hashes
 */
async function findFilesInTree(treeHash, pattern) {
  const files = await flattenTree(treeHash);
  const matches = new Map();

  for (const [path, hash] of files) {
    const fileName = path.split("/").pop();
    if (pattern.test(fileName)) {
      matches.set(path, hash);
    }
  }

  return matches;
}

/**
 * Gets the directory structure as a nested object
 * @param {string} treeHash - Hash of the tree
 * @returns {Promise<Object>} Nested directory structure
 */
async function getTreeStructure(treeHash) {
  const files = await flattenTree(treeHash);
  const structure = {};

  for (const [filePath, hash] of files) {
    const parts = filePath.split("/");
    let current = structure;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = hash;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }

  return structure;
}

/**
 * Exports a tree to a directory on disk
 * @param {string} treeHash - Hash of the tree
 * @param {string} outputPath - Directory to export to
 * @param {Function} getBlob - Function to get blob content from hash
 * @returns {Promise<void>}
 */
async function exportTreeToDirectory(treeHash, outputPath, getBlob) {
  const files = await flattenTree(treeHash);

  for (const [filePath, hash] of files) {
    const fullPath = path.join(outputPath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });

    const blob = await getBlob(hash);
    await fs.writeFile(fullPath, blob);
  }
}

/**
 * Validates a tree structure (checks if all referenced blobs exist)
 * @param {string} treeHash - Hash of the tree
 * @param {Function} objectExists - Function to check if an object exists
 * @returns {Promise<{valid: boolean, missing: string[]}>}
 */
async function validateTree(treeHash, objectExists) {
  const files = await flattenTree(treeHash);
  const missing = [];

  for (const [path, hash] of files) {
    if (!(await objectExists(hash))) {
      missing.push(`${path}: ${hash}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Merges multiple trees together
 * @param {string[]} treeHashes - Array of tree hashes to merge
 * @param {Object} options - Merge options
 * @param {string} options.strategy - Merge strategy: 'union', 'intersection', 'first'
 * @returns {Promise<Object>} Merged tree
 */
async function mergeTrees(treeHashes, options = {}) {
  const { strategy = "union" } = options;

  const allFiles = await Promise.all(
    treeHashes.map((hash) => flattenTree(hash)),
  );

  if (strategy === "union") {
    const merged = new Map();
    for (const files of allFiles) {
      for (const [path, hash] of files) {
        merged.set(path, { mode: "100644", hash });
      }
    }
    return await buildTreeFromPath(merged);
  }

  if (strategy === "intersection") {
    const firstFiles = allFiles[0];
    const merged = new Map();

    for (const [path, hash] of firstFiles) {
      const existsInAll = allFiles.every((files) => files.has(path));
      if (existsInAll) {
        merged.set(path, { mode: "100644", hash });
      }
    }
    return await buildTreeFromPath(merged);
  }

  if (strategy === "first") {
    return await buildTreeFromPath(allFiles[0]);
  }

  throw new Error(`Unknown merge strategy: ${strategy}`);
}

export {
  readAllFilesAndDirectories,
  shouldIgnore,
  walkDirectory,
  createTreeFromDirectory,
  updateTree,
  //   removeFromTree,
  diffTrees,
  filterTree,
  getTreeSize,
  findFilesInTree,
  getTreeStructure,
  exportTreeToDirectory,
  validateTree,
  mergeTrees,
};

(async () => {
  const _1 = await readAllFilesAndDirectories("./docs");
  console.log(_1);
  const _2 = await walkDirectory("./docs", {
    ignore: ["node_modules", ".git", ".loonygit", "dist"],
  });
  console.log(_2);
  const _3 = await createTreeFromDirectory("./docs", {
    ignore: ["node_modules", ".git", ".loonygit", "dist"],
    hashFile: hash,
  });
  console.log(_3);
})();
