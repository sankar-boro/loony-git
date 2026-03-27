export function normalizePath(filePath: string): string {
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
