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

export type Object = Blob | Tree | Commit;

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
