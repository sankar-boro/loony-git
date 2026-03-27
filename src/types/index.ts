export { ObjectStore } from "./objectStore";

export type Hash = string;

export interface Blob {
  type: "blob";
  content: Buffer;
  hash: Hash;
}

export interface TreeEntry {
  name: string;
  mode: "100644" | "100755" | "040000"; // file, executable, directory
  hash: Hash;
}

export interface Tree {
  type: "tree";
  entries: TreeEntry[];
  hash: Hash;
}

export interface Commit {
  type: "commit";
  tree: Hash;
  parents: Hash[];
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  message: string;
  hash: Hash;
}

export interface ConfigValues {
  user?: {
    name?: string;
    email?: string;
  };
  core?: {
    editor?: string;
    autocrlf?: boolean;
    excludesfile?: string;
    pager?: string;
  };
  color?: {
    ui?: boolean;
    status?: string;
    branch?: string;
  };
  alias?: Record<string, string>;
  [key: string]: any;
}

export interface Rule {
  pattern: string;
  regex: RegExp;
  negate: boolean;
  dirOnly: boolean;
  basePattern: string | null; // For patterns without slashes
  isRootRelative: boolean;
  hasMagic: boolean; // Has wildcards
  raw: string;
}

export interface IgnoreOptions {
  dot?: boolean; // Whether to ignore dot files
  caseSensitive?: boolean;
  allowNegation?: boolean;
  cache?: boolean;
}

export interface Blob {
  type: "blob";
  content: Buffer;
  hash: Hash;
}

export interface TreeEntry {
  name: string;
  mode: "100644" | "100755" | "040000"; // file, executable, directory
  hash: Hash;
}

export interface Tree {
  type: "tree";
  entries: TreeEntry[];
  hash: Hash;
}

export interface Commit {
  type: "commit";
  tree: Hash;
  parents: Hash[];
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  message: string;
  hash: Hash;
}

export type Object = Blob | Tree | Commit;

export interface FileStatus {
  path: string;
  status: "untracked" | "modified" | "deleted" | "added" | "unmodified";
}

export interface IndexEntry {
  hash: string;
  mode: string;
  path: string;
  stage: number; // 0 for normal, 1-3 for merge conflicts
  mtime?: number; // modification time for performance
  size?: number; // file size for performance
}

export type RemoteMap = Record<
  string,
  { url?: string; fetch?: string | string[] }
>;
