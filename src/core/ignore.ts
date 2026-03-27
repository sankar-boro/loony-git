import fs from "fs";
import path from "path";
import { loonyignorePath } from "../paths";
import { matchesRule } from "../utils";

interface Rule {
  pattern: string;
  regex: RegExp;
  negate: boolean;
  dirOnly: boolean;
  basePattern: string | null; // For patterns without slashes
  isRootRelative: boolean;
  hasMagic: boolean; // Has wildcards
  raw: string;
}

interface IgnoreOptions {
  dot?: boolean; // Whether to ignore dot files
  caseSensitive?: boolean;
  allowNegation?: boolean;
  cache?: boolean;
}

export class Ignore {
  private rules: Rule[] = [];
  private options: Required<IgnoreOptions>;
  private cache: Map<string, boolean> = new Map();
  private regexCache: Map<string, RegExp> = new Map();

  // Pattern optimizations
  private exactMatchRules: Map<string, Rule> = new Map();
  private prefixRules: Rule[] = [];
  private suffixRules: Rule[] = [];

  constructor(options: IgnoreOptions = {}) {
    this.options = {
      dot: false,
      caseSensitive: false,
      allowNegation: true,
      cache: true,
      ...options,
    };

    this.loadRules();
  }

  private loadRules(): void {
    try {
      const content = fs.readFileSync(loonyignorePath, "utf-8");
      this.addMany(content.split(/\r?\n/));
    } catch (error) {
      // If file doesn't exist, just continue with empty rules
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  add(pattern: string): void {
    const trimmed = pattern.trim();

    // Handle empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) return;

    let rawPattern = trimmed;
    let negate = false;
    let dirOnly = false;

    // Handle negation
    if (this.options.allowNegation && rawPattern.startsWith("!")) {
      negate = true;
      rawPattern = rawPattern.slice(1).trim();
    }

    // Handle trailing slash (directory only)
    if (rawPattern.endsWith("/")) {
      dirOnly = true;
      rawPattern = rawPattern.slice(0, -1);
    }

    // Check if pattern has wildcards
    const hasMagic = /[*?[\]]/.test(rawPattern);

    // Check if root-relative
    const isRootRelative = rawPattern.startsWith("/");
    const basePattern = isRootRelative ? rawPattern.slice(1) : rawPattern;

    // Convert to regex
    const regex = this.patternToRegex(basePattern, {
      isRootRelative,
      dirOnly,
      hasMagic,
    });

    const rule: Rule = {
      pattern: basePattern,
      regex,
      negate,
      dirOnly,
      basePattern: basePattern.includes("/") ? null : basePattern,
      isRootRelative,
      hasMagic,
      raw: trimmed,
    };

    this.rules.push(rule);

    // Optimize rules for faster matching
    if (!hasMagic) {
      // Exact match optimization
      if (!basePattern.includes("/")) {
        this.exactMatchRules.set(basePattern, rule);
      }
    } else if (basePattern.startsWith("*") && !basePattern.includes("/")) {
      // Suffix match optimization (e.g., *.log)
      this.suffixRules.push(rule);
    } else if (basePattern.endsWith("*") && !basePattern.includes("/")) {
      // Prefix match optimization (e.g., build-*)
      this.prefixRules.push(rule);
    }
  }

  addMany(patterns: string[]): void {
    for (const pattern of patterns) {
      this.add(pattern);
    }
  }

  ignores(filePath: string): boolean {
    return this.shouldIgnore(filePath);
  }

  shouldIgnore(filePath: string, isDir?: boolean): boolean {
    const cacheKey = `${filePath}:${isDir}`;

    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Normalize path
    const normalized = this.normalizePath(filePath);
    const stats = isDir !== undefined ? null : this.getStats(filePath);
    const isDirectory = isDir ?? stats?.isDirectory() ?? false;

    // Handle dot files
    if (!this.options.dot) {
      const basename = path.basename(normalized);
      if (basename.startsWith(".") && basename !== ".") {
        if (this.options.cache) this.cache.set(cacheKey, true);
        return true;
      }
    }

    let ignored = false;
    let matchedByNegation = false;

    // Fast path: check exact matches first
    if (!matchedByNegation) {
      const basename = path.basename(normalized);
      const exactRule = this.exactMatchRules.get(basename);
      if (exactRule) {
        if (this.matchesRule(normalized, basename, exactRule, isDirectory)) {
          ignored = !exactRule.negate;
          matchedByNegation = exactRule.negate;
        }
      }
    }

    // Check suffix matches (e.g., *.log)
    if (!matchedByNegation) {
      for (const rule of this.suffixRules) {
        if (
          this.matchesRule(
            normalized,
            path.basename(normalized),
            rule,
            isDirectory,
          )
        ) {
          ignored = !rule.negate;
          matchedByNegation = rule.negate;
          if (matchedByNegation) break;
        }
      }
    }

    // Check prefix matches (e.g., build-*)
    if (!matchedByNegation) {
      for (const rule of this.prefixRules) {
        if (
          this.matchesRule(
            normalized,
            path.basename(normalized),
            rule,
            isDirectory,
          )
        ) {
          ignored = !rule.negate;
          matchedByNegation = rule.negate;
          if (matchedByNegation) break;
        }
      }
    }

    // Full regex matching for remaining rules
    if (!matchedByNegation) {
      for (const rule of this.rules) {
        if (rule.hasMagic && rule !== this.exactMatchRules.get(rule.pattern)) {
          if (
            this.matchesRule(
              normalized,
              path.basename(normalized),
              rule,
              isDirectory,
            )
          ) {
            ignored = !rule.negate;
            if (rule.negate) break;
          }
        }
      }
    }

    if (this.options.cache) {
      this.cache.set(cacheKey, ignored);
    }

    return ignored;
  }

  private matchesRule(
    filePath: string,
    basename: string,
    rule: Rule,
    isDirectory: boolean,
  ): boolean {
    return matchesRule(filePath, basename, rule, isDirectory);
  }

  private patternToRegex(
    pattern: string,
    options: {
      isRootRelative: boolean;
      dirOnly: boolean;
      hasMagic: boolean;
    },
  ): RegExp {
    const cacheKey = `${pattern}:${options.isRootRelative}:${options.dirOnly}`;

    if (this.regexCache.has(cacheKey)) {
      return this.regexCache.get(cacheKey)!;
    }

    let regexStr = "^";
    let i = 0;
    const len = pattern.length;

    // Handle root-relative patterns
    if (!options.isRootRelative && !pattern.startsWith("**")) {
      regexStr += "(.*/)?";
    }

    while (i < len) {
      const char = pattern[i];

      // Handle character classes [...]
      if (char === "[" && i + 1 < len) {
        const closingIndex = pattern.indexOf("]", i);
        if (closingIndex > i) {
          const classContent = pattern.slice(i + 1, closingIndex);
          regexStr += "[" + this.escapeRegexChars(classContent) + "]";
          i = closingIndex + 1;
          continue;
        }
      }

      // Handle globstar patterns
      if (char === "*" && pattern[i + 1] === "*") {
        // Look ahead to see what's after the globstar
        if (pattern[i + 2] === "/") {
          // **/ - matches any number of directories
          regexStr += "(.*/)?";
          i += 3;
        } else if (i + 2 === len) {
          // ** at end - matches everything
          regexStr += ".*";
          i += 2;
        } else {
          // ** in middle - matches anything including /
          regexStr += ".*";
          i += 2;
        }
        continue;
      }

      // Handle single star
      if (char === "*") {
        regexStr += "[^/]*";
        i++;
        continue;
      }

      // Handle question mark
      if (char === "?") {
        regexStr += "[^/]";
        i++;
        continue;
      }

      // Escape special regex characters
      if (/[.+^${}()|[\]\\]/.test(char)) {
        regexStr += "\\" + char;
      } else {
        regexStr += char;
      }

      i++;
    }

    // Add end anchor
    if (options.dirOnly) {
      regexStr += "$"; // Directory patterns should end exactly
    } else {
      regexStr += "(/.*)?$"; // File patterns can have children
    }

    const flags = this.options.caseSensitive ? "" : "i";
    const regex = new RegExp(regexStr, flags);

    this.regexCache.set(cacheKey, regex);
    return regex;
  }

  private normalizePath(filePath: string): string {
    // Convert Windows backslashes to forward slashes
    let normalized = filePath.replace(/\\/g, "/");

    // Remove leading './'
    if (normalized.startsWith("./")) {
      normalized = normalized.slice(2);
    }

    // Remove trailing slash
    if (normalized.endsWith("/") && normalized !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  private getStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  private escapeRegexChars(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Clear cache (useful for testing or when files change)
  clearCache(): void {
    this.cache.clear();
    this.regexCache.clear();
  }

  // Reload rules from file
  reload(): void {
    this.rules = [];
    this.exactMatchRules.clear();
    this.prefixRules = [];
    this.suffixRules = [];
    this.clearCache();
    this.loadRules();
  }

  // Check if a path matches any rule (useful for debugging)
  explain(filePath: string): { ignored: boolean; matchingRule?: Rule } {
    const normalized = this.normalizePath(filePath);
    const isDirectory = this.getStats(filePath)?.isDirectory() ?? false;

    for (const rule of this.rules) {
      if (rule.dirOnly && !isDirectory) continue;

      if (
        rule.regex.test(normalized) ||
        (rule.basePattern && rule.regex.test(path.basename(normalized)))
      ) {
        return {
          ignored: !rule.negate,
          matchingRule: rule,
        };
      }
    }

    return { ignored: false };
  }

  // Get all active rules
  getRules(): Rule[] {
    return [...this.rules];
  }

  // Create a child ignore instance with additional rules
  createChild(additionalPatterns: string[]): Ignore {
    const child = new Ignore(this.options);
    child.rules = [...this.rules];
    child.exactMatchRules = new Map(this.exactMatchRules);
    child.prefixRules = [...this.prefixRules];
    child.suffixRules = [...this.suffixRules];
    child.addMany(additionalPatterns);
    return child;
  }
}

// Create and export singleton instance
export const ignore = new Ignore();

// Export factory function for creating custom instances
export function createIgnore(options?: IgnoreOptions): Ignore {
  return new Ignore(options);
}
