import fs from "fs";
import path from "path";
import { loonyignorePath } from "../paths";
import { matchesRule } from "../utils";
import { IgnoreOptions, Rule } from "../types";

export function createIgnore(options: IgnoreOptions = {}) {
  const opts: Required<IgnoreOptions> = {
    dot: false,
    caseSensitive: false,
    allowNegation: true,
    cache: true,
    ...options,
  };

  const rules: Rule[] = [];
  const cache = new Map<string, boolean>();
  const regexCache = new Map<string, RegExp>();

  const exactMatchRules = new Map<string, Rule>();
  const prefixRules: Rule[] = [];
  const suffixRules: Rule[] = [];

  function loadRules() {
    try {
      const content = fs.readFileSync(loonyignorePath, "utf-8");
      addMany(content.split(/\r?\n/));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  function add(pattern: string) {
    const trimmed = pattern.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    let rawPattern = trimmed;
    let negate = false;
    let dirOnly = false;

    if (opts.allowNegation && rawPattern.startsWith("!")) {
      negate = true;
      rawPattern = rawPattern.slice(1).trim();
    }

    if (rawPattern.endsWith("/")) {
      dirOnly = true;
      rawPattern = rawPattern.slice(0, -1);
    }

    const hasMagic = /[*?[\]]/.test(rawPattern);
    const isRootRelative = rawPattern.startsWith("/");
    const basePattern = isRootRelative ? rawPattern.slice(1) : rawPattern;

    const regex = patternToRegex(basePattern, {
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

    rules.push(rule);

    if (!hasMagic) {
      if (!basePattern.includes("/")) {
        exactMatchRules.set(basePattern, rule);
      }
    } else if (basePattern.startsWith("*") && !basePattern.includes("/")) {
      suffixRules.push(rule);
    } else if (basePattern.endsWith("*") && !basePattern.includes("/")) {
      prefixRules.push(rule);
    }
  }

  function addMany(patterns: string[]) {
    for (const p of patterns) add(p);
  }

  function ignores(filePath: string) {
    return shouldIgnore(filePath);
  }

  function shouldIgnore(filePath: string, isDir?: boolean): boolean {
    const cacheKey = `${filePath}:${isDir}`;

    if (opts.cache && cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const normalized = normalizePath(filePath);
    const stats = isDir !== undefined ? null : getStats(filePath);
    const isDirectory = isDir ?? stats?.isDirectory() ?? false;

    if (!opts.dot) {
      const basename = path.basename(normalized);
      if (basename.startsWith(".") && basename !== ".") {
        cache.set(cacheKey, true);
        return true;
      }
    }

    let ignored = false;
    let matchedByNegation = false;

    const basename = path.basename(normalized);

    const exactRule = exactMatchRules.get(basename);
    if (exactRule) {
      if (matchesRule(normalized, basename, exactRule, isDirectory)) {
        ignored = !exactRule.negate;
        matchedByNegation = exactRule.negate;
      }
    }

    if (!matchedByNegation) {
      for (const rule of suffixRules) {
        if (matchesRule(normalized, basename, rule, isDirectory)) {
          ignored = !rule.negate;
          matchedByNegation = rule.negate;
          if (matchedByNegation) break;
        }
      }
    }

    if (!matchedByNegation) {
      for (const rule of prefixRules) {
        if (matchesRule(normalized, basename, rule, isDirectory)) {
          ignored = !rule.negate;
          matchedByNegation = rule.negate;
          if (matchedByNegation) break;
        }
      }
    }

    if (!matchedByNegation) {
      for (const rule of rules) {
        if (rule.hasMagic) {
          if (matchesRule(normalized, basename, rule, isDirectory)) {
            ignored = !rule.negate;
            if (rule.negate) break;
          }
        }
      }
    }

    if (opts.cache) cache.set(cacheKey, ignored);
    return ignored;
  }

  function patternToRegex(
    pattern: string,
    options: {
      isRootRelative: boolean;
      dirOnly: boolean;
      hasMagic: boolean;
    },
  ): RegExp {
    const cacheKey = `${pattern}:${options.isRootRelative}:${options.dirOnly}`;
    if (regexCache.has(cacheKey)) return regexCache.get(cacheKey)!;

    let regexStr = "^";
    let i = 0;

    if (!options.isRootRelative && !pattern.startsWith("**")) {
      regexStr += "(.*/)?";
    }

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === "[" && i + 1 < pattern.length) {
        const closing = pattern.indexOf("]", i);
        if (closing > i) {
          const content = pattern.slice(i + 1, closing);
          regexStr += "[" + escapeRegexChars(content) + "]";
          i = closing + 1;
          continue;
        }
      }

      if (char === "*" && pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          regexStr += "(.*/)?";
          i += 3;
        } else {
          regexStr += ".*";
          i += 2;
        }
        continue;
      }

      if (char === "*") {
        regexStr += "[^/]*";
        i++;
        continue;
      }

      if (char === "?") {
        regexStr += "[^/]";
        i++;
        continue;
      }

      if (/[.+^${}()|[\]\\]/.test(char)) {
        regexStr += "\\" + char;
      } else {
        regexStr += char;
      }

      i++;
    }

    regexStr += options.dirOnly ? "$" : "(/.*)?$";

    const flags = opts.caseSensitive ? "" : "i";
    const regex = new RegExp(regexStr, flags);

    regexCache.set(cacheKey, regex);
    return regex;
  }

  function normalizePath(filePath: string) {
    let normalized = filePath.replace(/\\/g, "/");
    if (normalized.startsWith("./")) normalized = normalized.slice(2);
    if (normalized.endsWith("/") && normalized !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  function getStats(filePath: string) {
    try {
      return fs.statSync(filePath);
    } catch {
      return null;
    }
  }

  function escapeRegexChars(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function clearCache() {
    cache.clear();
    regexCache.clear();
  }

  function reload() {
    rules.length = 0;
    exactMatchRules.clear();
    prefixRules.length = 0;
    suffixRules.length = 0;
    clearCache();
    loadRules();
  }

  function explain(filePath: string) {
    const normalized = normalizePath(filePath);
    const isDirectory = getStats(filePath)?.isDirectory() ?? false;

    for (const rule of rules) {
      if (rule.dirOnly && !isDirectory) continue;

      if (
        rule.regex.test(normalized) ||
        (rule.basePattern && rule.regex.test(path.basename(normalized)))
      ) {
        return { ignored: !rule.negate, matchingRule: rule };
      }
    }

    return { ignored: false };
  }

  function getRules() {
    return [...rules];
  }

  function createChild(additionalPatterns: string[]) {
    const child = createIgnore(opts);
    child.addMany(getRules().map((r) => r.raw));
    child.addMany(additionalPatterns);
    return child;
  }

  loadRules();

  return {
    add,
    addMany,
    ignores,
    shouldIgnore,
    clearCache,
    reload,
    explain,
    getRules,
    createChild,
  };
}

// default instance
export const ignore = createIgnore();

function test() {
  /* --- basic usage (default instance) --- */

  ignore.add("node_modules/");
  ignore.add("*.log");

  console.log(ignore.ignores("node_modules")); // true
  console.log(ignore.ignores("app.log")); // true
  console.log(ignore.ignores("src/index.ts")); // false

  /* --- custom instance --- */

  const ig = createIgnore({
    dot: false,
    caseSensitive: false,
  });

  ig.addMany([
    "dist/",
    "*.tmp",
    "!keep.tmp", // negation (allow this file)
  ]);

  console.log(ig.ignores("dist")); // true
  console.log(ig.ignores("file.tmp")); // true
  console.log(ig.ignores("keep.tmp")); // false

  /* --- directory vs file --- */

  console.log(ig.shouldIgnore("dist", true)); // true (directory)

  /* --- debug which rule matched --- */

  console.log(ig.explain("file.tmp"));
  // {
  //   ignored: true,
  //   matchingRule: { ... }
  // }

  /* --- child instance --- */

  const child = ig.createChild(["build/"]);

  console.log(child.ignores("build")); // true
  console.log(ig.ignores("build")); // false
}
