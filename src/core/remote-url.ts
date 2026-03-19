export class GitUrlParser {
  private url: URL;

  constructor(private rawUrl: string) {
    this.url = new URL(rawUrl);
  }

  get protocol(): string {
    return this.url.protocol.replace(":", "");
  }

  get host(): string {
    return this.url.hostname;
  }

  get port(): string {
    return this.url.port;
  }

  get owner(): string | null {
    const parts = this.getPathParts();
    return parts.length >= 1 ? parts[0] : null;
  }

  get repo(): string | null {
    const parts = this.getPathParts();
    if (parts.length >= 2) {
      return parts[1].replace(/\.git$/, "");
    }
    return null;
  }

  get fullName(): string | null {
    if (this.owner && this.repo) {
      return `${this.owner}/${this.repo}`;
    }
    return null;
  }

  private getPathParts(): string[] {
    return this.url.pathname.split("/").filter(Boolean);
  }
}
