import { Config } from "../core/config";

export async function configCommand(
  args: string[],
  options: {
    global?: boolean;
    local?: boolean;
    list?: boolean;
    unset?: boolean;
    add?: boolean;
    replaceAll?: boolean;
    get?: boolean;
    "get-all"?: boolean;
    "get-regexp"?: boolean;
    "replace-all"?: boolean;
  },
): Promise<void> {
  const config = new Config();
  await config.loadAll();

  // Handle remote subcommand
  if (args[0] === "remote") {
    return handleRemoteCommand(args.slice(1), config);
  }

  // Handle --list flag (equivalent to --get-all .*)
  if (options.list || (options["get-all"] && args.length === 0)) {
    const entries = options.global ? config.list(true) : config.list();
    for (const [key, value] of Object.entries(entries)) {
      console.log(`${key}=${value}`);
    }
    return;
  }

  // Handle --unset
  if (options.unset) {
    if (args.length === 0) {
      throw new Error("--unset requires a key");
    }
    return handleUnset(args, options, config);
  }

  // Handle --unset for specific value (git config --unset section.key value)
  if (options.unset && args.length === 2) {
    const [key, value] = args;
    return handleUnsetValue(key, value, options, config);
  }

  // Handle --add (append a new value to a multi-valued key)
  if (options.add) {
    if (args.length !== 2) {
      throw new Error("--add requires a key and value");
    }
    return handleAdd(args[0], args[1], options, config);
  }

  // Handle --replace-all
  if (options.replaceAll || options["replace-all"]) {
    if (args.length < 2) {
      throw new Error("--replace-all requires a key and value");
    }
    return handleReplaceAll(args[0], args[1], args[2], options, config);
  }

  // Handle --get-regexp
  if (options["get-regexp"]) {
    if (args.length === 0) {
      throw new Error("--get-regexp requires a pattern");
    }
    return handleGetRegexp(args[0], options, config);
  }

  // Handle --get-all
  if (options["get-all"]) {
    if (args.length === 0) {
      throw new Error("--get-all requires a key");
    }
    return handleGetAll(args[0], options, config);
  }

  // Handle --get (default behavior for single key)
  if (options.get || args.length === 1) {
    return handleGet(args[0], options, config);
  }

  // Handle setting a value (key value pattern)
  if (args.length >= 2) {
    return handleSet(args[0], args[1], options, config);
  }

  // If no arguments, show all config (like git config --list)
  if (args.length === 0) {
    const entries = options.global ? config.list(true) : config.list();
    for (const [key, value] of Object.entries(entries)) {
      console.log(`${key}=${value}`);
    }
    return;
  }

  throw new Error("Invalid config command. Usage: loonygit config [options]");
}

async function handleRemoteCommand(
  args: string[],
  config: Config,
): Promise<void> {
  const action = args[0];
  const name = args[1];
  const url = args[2];

  if (!action) {
    throw new Error("Remote command requires an action");
  }

  switch (action) {
    case "add":
      if (!name || !url) {
        throw new Error("Usage: config remote add <name> <url>");
      }
      config.set(`remote.${name}.url`, url);
      await config.saveLocal();
      console.log(`Added remote '${name}' -> ${url}`);
      break;

    case "set-url":
      if (!name || !url) {
        throw new Error("Usage: config remote set-url <name> <url>");
      }
      config.set(`remote.${name}.url`, url);
      await config.saveLocal();
      console.log(`Updated remote '${name}' -> ${url}`);
      break;

    case "remove":
      if (!name) {
        throw new Error("Usage: config remote remove <name>");
      }
      config.unset(`remote.${name}.url`);
      await config.saveLocal();
      console.log(`Removed remote '${name}'`);
      break;

    case "get-url":
      if (!name) {
        throw new Error("Usage: config remote get-url <name>");
      }
      const get_url = config.get(`remote.${name}.url`);
      if (!get_url) {
        console.error(`Remote '${name}' not found`);
        process.exit(1);
      }
      console.log(get_url);
      break;

    default:
      throw new Error(`Unknown remote action: ${action}`);
  }
}

async function handleGet(
  key: string,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  const value = config.get(key);
  if (value === null) {
    process.exit(1); // Git returns exit code 1 when key not found
  }
  console.log(value);
}

async function handleGetAll(
  key: string,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  const values = config.getAll(key);
  if (values.length === 0) {
    process.exit(1);
  }
  for (const value of values) {
    console.log(value);
  }
}

async function handleGetRegexp(
  pattern: string,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  const entries = config.getRegexp(pattern);
  if (Object.keys(entries).length === 0) {
    process.exit(1);
  }
  for (const [key, value] of Object.entries(entries)) {
    console.log(`${key} ${value}`);
  }
}

async function handleSet(
  key: string,
  value: string,
  options: { global?: boolean; local?: boolean; replaceAll?: boolean },
  config: Config,
): Promise<void> {
  config.set(key, value, options.global);

  if (options.global) {
    await config.saveGlobal();
    console.log(`Set global ${key} = ${value}`);
  } else {
    await config.saveLocal();
    console.log(`Set ${key} = ${value}`);
  }
}

async function handleAdd(
  key: string,
  value: string,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  config.add(key, value, options.global);

  if (options.global) {
    await config.saveGlobal();
    console.log(`Added global ${key} = ${value}`);
  } else {
    await config.saveLocal();
    console.log(`Added ${key} = ${value}`);
  }
}

async function handleReplaceAll(
  key: string,
  value: string,
  valueRegex: string | undefined,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  // If valueRegex is provided, only replace values matching the regex
  config.replaceAll(key, value, valueRegex, options.global);

  if (options.global) {
    await config.saveGlobal();
    console.log(`Replaced all global values for ${key} = ${value}`);
  } else {
    await config.saveLocal();
    console.log(`Replaced all values for ${key} = ${value}`);
  }
}

async function handleUnset(
  args: string[],
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  const key = args[0];
  config.unset(key, options.global);

  if (options.global) {
    await config.saveGlobal();
    console.log(`Unset global ${key}`);
  } else {
    await config.saveLocal();
    console.log(`Unset ${key}`);
  }
}

async function handleUnsetValue(
  key: string,
  value: string,
  options: { global?: boolean; local?: boolean },
  config: Config,
): Promise<void> {
  config.unsetValue(key, value, options.global);

  if (options.global) {
    await config.saveGlobal();
    console.log(`Unset global ${key} = ${value}`);
  } else {
    await config.saveLocal();
    console.log(`Unset ${key} = ${value}`);
  }
}
