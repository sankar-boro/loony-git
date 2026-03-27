export function parseGitUrl(url: string) {
  const parsed = new URL(url);

  // Remove leading/trailing slashes and split
  const parts = parsed.pathname.replace(/^\/|\/$/g, "").split("/");

  if (parts.length < 2) {
    throw new Error("Invalid Git URL format");
  }

  const username = parts[0];
  const repo = parts[1].replace(/\.git$/, "");

  return { username, repo };
}
