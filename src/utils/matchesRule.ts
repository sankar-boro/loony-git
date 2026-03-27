import { Rule } from "../types";

export function matchesRule(
  filePath: string,
  basename: string,
  rule: Rule,
  isDirectory: boolean,
): boolean {
  // Skip directory-only rules for files
  if (rule.dirOnly && !isDirectory) return false;

  // Test against full path
  if (rule.regex.test(filePath)) return true;

  // For patterns without slashes, test against basename
  if (!rule.pattern.includes("/") && !rule.isRootRelative && rule.basePattern) {
    if (rule.regex.test(basename)) return true;
  }

  // Test against parent directories for deep matching
  if (!rule.pattern.includes("/") && !rule.isRootRelative) {
    const parts = filePath.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join("/");
      if (rule.regex.test(dirPath)) return true;
    }
  }

  return false;
}
