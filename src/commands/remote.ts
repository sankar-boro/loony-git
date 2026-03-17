import { Config } from "../core/config";

export async function remoteCommand(
  args: string[],
  options: {
    verbose?: boolean;
  },
): Promise<void> {
  const config = new Config();
  await config.loadAll();

  const allConfig = config.list();
  const remotes: Record<string, string> = {};

  // Collect remotes from config
  for (const key in allConfig) {
    if (key.startsWith("remote.") && key.endsWith(".url")) {
      const name = key.split(".")[1];
      remotes[name] = allConfig[key];
    }
  }

  // No args → list remotes
  if (args.length === 0) {
    if (options.verbose) {
      for (const name in remotes) {
        console.log(`${name}\t${remotes[name]} (fetch)`);
        console.log(`${name}\t${remotes[name]} (push)`);
      }
    } else {
      for (const name in remotes) {
        console.log(name);
      }
    }
    return;
  }

  const command = args[0];

  // remote add <name> <url>
  if (command === "add") {
    if (args.length !== 3) {
      throw new Error("Usage: remote add <name> <url>");
    }

    const name = args[1];
    const url = args[2];

    config.set(`remote.${name}.url`, url);
    await config.saveLocal();

    console.log(`Added remote ${name} ${url}`);
    return;
  }

  // remote remove <name>
  if (command === "remove") {
    if (args.length !== 2) {
      throw new Error("Usage: remote remove <name>");
    }

    const name = args[1];

    config.unset(`remote.${name}.url`);
    await config.saveLocal();

    console.log(`Removed remote ${name}`);
    return;
  }

  // remote set-url <name> <url>
  if (command === "set-url") {
    if (args.length !== 3) {
      throw new Error("Usage: remote set-url <name> <url>");
    }

    const name = args[1];
    const url = args[2];

    config.set(`remote.${name}.url`, url);
    await config.saveLocal();

    console.log(`Updated ${name} → ${url}`);
    return;
  }

  // remote show <name>
  if (command === "show") {
    if (args.length !== 2) {
      throw new Error("Usage: remote show <name>");
    }

    const name = args[1];
    const url = remotes[name];

    if (!url) {
      throw new Error(`Remote ${name} not found`);
    }

    console.log(`Remote: ${name}`);
    console.log(`URL: ${url}`);
    return;
  }

  throw new Error("Invalid remote command");
}
