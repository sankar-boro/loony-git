import { RemoteMap } from "../types";

export function getRemotes(config: any): RemoteMap {
  const all = config.listAll();

  if (!all.remote) {
    return {};
  }

  return all.remote as RemoteMap;
}

export function ensureRemoteExists(remotes: RemoteMap, name: string) {
  if (!remotes[name]) {
    throw new Error(`Remote '${name}' does not exist`);
  }
}

export function ensureRemoteMissing(remotes: RemoteMap, name: string) {
  if (remotes[name]) {
    throw new Error(`Remote '${name}' already exists`);
  }
}
