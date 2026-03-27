import fs from "fs/promises";
import path from "path";

import { shouldIgnore } from "./shouldIgnore";

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
export async function readAllFilesAndDirectories(
  rootPath: string,
  options: {
    ignore: any[];
    includeDirectories: boolean;
    includeFiles: boolean;
    absolute: boolean;
  } = {
    ignore: [],
    includeDirectories: false,
    includeFiles: false,
    absolute: false,
  },
): Promise<any[]> {
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
