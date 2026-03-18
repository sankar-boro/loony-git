import { Config } from "../core/config";

type RemoteMap = Record<string, { url?: string; fetch?: string | string[] }>;

function getRemotes(config: Config): RemoteMap {
  const all = config.listAll();

  if (!all.remote) {
    return {};
  }

  return all.remote as RemoteMap;
}

function ensureRemoteExists(remotes: RemoteMap, name: string) {
  if (!remotes[name]) {
    throw new Error(`Remote '${name}' does not exist`);
  }
}

function ensureRemoteMissing(remotes: RemoteMap, name: string) {
  if (remotes[name]) {
    throw new Error(`Remote '${name}' already exists`);
  }
}

export async function remoteCommand(
  args: string[],
  options: { verbose?: boolean },
): Promise<void> {
  const config = new Config();
  await config.loadAll();

  const allConfig = config.list();
  // const remotes: Record<string, string> = {};

  // // Collect remotes
  // for (const key in allConfig) {
  //   if (key.startsWith("remote.") && key.endsWith(".url")) {
  //     const name = key.split(".")[1];
  //     remotes[name] = allConfig[key];
  //   }
  // }

  const remotes = getRemotes(config);

  // Handle `remote -v`
  if (args[0] === "-v" || options.verbose) {
    for (const name in remotes) {
      const url = remotes[name];
      console.log(`${name}\t${url} (fetch)`);
      console.log(`${name}\t${url} (push)`);
    }
    return;
  }

  // No args → list remotes
  if (args.length === 0) {
    for (const name in remotes) {
      console.log(name);
    }
    return;
  }

  const command = args[0];

  // console.log(
  //   JSON.stringify({
  //     allConfig,
  //     args,
  //     remotes,
  //   }),
  // );
  switch (command) {
    case "add": {
      if (args.length !== 3) {
        throw new Error("Usage: loonygit remote add <name> <url>");
      }

      const name = args[1];
      const url = args[2];

      if (remotes[name]) {
        throw new Error(`Remote '${name}' already exists`);
      }

      config.set(`remote.${name}.url`, url);
      await config.saveLocal();

      console.log(`Remote '${name}' added`);
      return;
    }

    case "remove": {
      if (args.length !== 2) {
        throw new Error("Usage: loonygit remote remove <name>");
      }

      const name = args[1];

      if (!remotes[name]) {
        throw new Error(`Remote '${name}' does not exist`);
      }

      config.unset(`remote.${name}.url`);
      await config.saveLocal();

      console.log(`Remote '${name}' removed`);
      return;
    }

    case "set-url": {
      if (args.length !== 3) {
        throw new Error("Usage: loonygit remote set-url <name> <url>");
      }

      const name = args[1];
      const url = args[2];

      // if (!remotes[name]) {
      //   throw new Error(`Remote '${name}' does not exist`);
      // }

      config.set(`remote.${name}.url`, url);
      await config.saveLocal();

      console.log(`Remote '${name}' updated`);
      return;
    }

    case "get-url": {
      if (args.length !== 2) {
        throw new Error("Usage: loonygit remote get-url <name>");
      }

      const name = args[1];

      ensureRemoteExists(remotes, name);

      const url = remotes[name].url;

      if (!url) {
        throw new Error(`Remote '${name}' has no URL`);
      }

      console.log(url);
      return;
    }

    case "show": {
      console.log(args, remotes);
      if (args.length !== 2) {
        throw new Error("Usage: loonygit remote show <name>");
      }

      const name = args[1];
      const url = remotes[name];

      if (!url) {
        throw new Error(`Remote '${name}' does not exist`);
      }

      console.log(`* remote ${name}`);
      console.log(`  Fetch URL: ${url}`);
      console.log(`  Push  URL: ${url}`);
      console.log(`  HEAD branch: (not set)`);
      return;
    }

    default:
      throw new Error(`Unknown remote command '${command}'`);
  }
}
