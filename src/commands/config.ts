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
  },
): Promise<void> {
  const config = new Config();
  await config.loadAll();

  // List all config
  if (options.list || (args.length === 0 && !options.unset)) {
    const configToShow = options.global ? config.list(true) : config.list();
    console.log(JSON.stringify(configToShow, null, 2));
    return;
  }

  // Unset a key
  if (options.unset) {
    if (args.length !== 1) {
      throw new Error("Unset requires a key");
    }
    config.unset(args[0], options.global);
    if (options.global) {
      await config.saveGlobal();
    } else if (options.local) {
      await config.saveLocal();
    } else {
      await config.saveLocal();
    }
    console.log(`Unset ${args[0]}`);
    return;
  }

  // Set a key
  if (args.length >= 2) {
    const key = args[0];
    const value = args[1];

    config.set(key, value, options.global);

    if (options.global) {
      await config.saveGlobal();
      console.log(`Set global ${key} = ${value}`);
    } else if (options.local) {
      await config.saveLocal();
      console.log(`Set local ${key} = ${value}`);
    } else {
      await config.saveLocal();
      console.log(`Set ${key} = ${value}`);
    }
    return;
  }

  // Get a single value
  if (args.length === 1) {
    const value = config.get(args[0]);
    if (value === null) {
      console.log(`${args[0]} is not configured`);
    } else {
      console.log(value);
    }
    return;
  }

  throw new Error("Invalid config command");
}
