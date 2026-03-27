export function getRepoName(url: string): string | null {
  try {
    const pathname = new URL(url).pathname; // /sankar-boro/hello.git
    const parts = pathname.split("/").filter(Boolean); // ["sankar-boro", "hello.git"]
    const repoWithGit = parts.pop(); // "hello.git"
    return repoWithGit?.replace(/\.git$/, "") ?? null; // "hello"
  } catch {
    return null;
  }
}
