import path from "path";

import { normalizePath, matchesRule, getStats } from "./index";
import { IgnoreOptions, Rule } from "../types";

const IgnorePatterns = [
  ".git",
  "node_modules",
  ".DS_Store",
  "*.log",
  ".loonygit",
  "dist",
  "build",
  "lib",
  ".env",
];

function shouldIgnore1(filePath: string, isDir?: boolean): boolean {
  let rules: Rule[] = [];
  let options: Required<IgnoreOptions>;
  let cache: Map<string, boolean> = new Map();
  let exactMatchRules: Map<string, Rule> = new Map();
  let regexCache: Map<string, RegExp> = new Map();

  let prefixRules: Rule[] = [];
  let suffixRules: Rule[] = [];

  options = {
    dot: false,
    caseSensitive: false,
    allowNegation: true,
    cache: true,
  };

  const cacheKey = `${filePath}:${isDir}`;

  if (options.cache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Normalize path
  const normalized = normalizePath(filePath);
  const stats = isDir !== undefined ? null : getStats(filePath);
  const isDirectory = isDir ?? stats?.isDirectory() ?? false;

  // Handle dot files
  if (!options.dot) {
    const basename = path.basename(normalized);
    if (basename.startsWith(".") && basename !== ".") {
      if (options.cache) cache.set(cacheKey, true);
      return true;
    }
  }

  let ignored = false;
  let matchedByNegation = false;

  // Fast path: check exact matches first
  if (!matchedByNegation) {
    const basename = path.basename(normalized);
    const exactRule = exactMatchRules.get(basename);
    if (exactRule) {
      if (matchesRule(normalized, basename, exactRule, isDirectory)) {
        ignored = !exactRule.negate;
        matchedByNegation = exactRule.negate;
      }
    }
  }

  // Check suffix matches (e.g., *.log)
  if (!matchedByNegation) {
    for (const rule of suffixRules) {
      if (
        matchesRule(normalized, path.basename(normalized), rule, isDirectory)
      ) {
        ignored = !rule.negate;
        matchedByNegation = rule.negate;
        if (matchedByNegation) break;
      }
    }
  }

  // Check prefix matches (e.g., build-*)
  if (!matchedByNegation) {
    for (const rule of prefixRules) {
      if (
        matchesRule(normalized, path.basename(normalized), rule, isDirectory)
      ) {
        ignored = !rule.negate;
        matchedByNegation = rule.negate;
        if (matchedByNegation) break;
      }
    }
  }

  // Full regex matching for remaining rules
  if (!matchedByNegation) {
    for (const rule of rules) {
      if (rule.hasMagic && rule !== exactMatchRules.get(rule.pattern)) {
        if (
          matchesRule(normalized, path.basename(normalized), rule, isDirectory)
        ) {
          ignored = !rule.negate;
          if (rule.negate) break;
        }
      }
    }
  }

  if (options.cache) {
    cache.set(cacheKey, ignored);
  }

  return ignored;
}

/**
 * Checks if a path should be ignored based on patterns
 * @param {string} filePath - Path to check
 * @param {string[]} ignorePatterns - Glob patterns to ignore
 * @returns {boolean}
 */
export function shouldIgnore(
  filePath: string,
  ignorePatterns: string[] = IgnorePatterns,
) {
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
