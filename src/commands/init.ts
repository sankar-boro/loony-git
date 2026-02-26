import * as fs from "fs/promises";
import * as path from "path";
import { Config } from "../core/config";
import {
  loonygitPath,
  objectsPath,
  refsPath,
  headsPath,
  tagsPath,
  headPath,
  configPath,
} from "../paths";

const defaultConfig = `[core]
  repositoryformatversion = 0
  filemode = true
  bare = false
  logallrefupdates = true

[color]
  ui = auto
`;

export async function initCommand(initPath: string = "."): Promise<void> {
  // Create directories
  await fs.mkdir(objectsPath, { recursive: true });
  await fs.mkdir(headsPath, { recursive: true });
  await fs.mkdir(tagsPath, { recursive: true });
  await fs.writeFile(headPath, "ref: refs/heads/main\n");
  await fs.writeFile(configPath, defaultConfig);

  // Try to get user info from global config
  const globalConfig = new Config();
  await globalConfig.loadGlobal();
  const userName = globalConfig.get("user.name");
  const userEmail = globalConfig.get("user.email");

  if (userName && userEmail) {
    // Add user info to local config
    const localConfig = new Config();
    await localConfig.loadAll();
    localConfig.set("user.name", userName, false);
    localConfig.set("user.email", userEmail, false);
    await localConfig.saveLocal();
  }

  console.log(`Initialized empty LoonyGit repository in ${loonygitPath}`);
}
