import * as path from "path";
import * as os from "os";
import {
  APP_NAME,
  GLOBAL_CONFIG_NAME,
  LOCAL_CONFIG_NAME,
  APP_IGNORE_NAME,
} from "./values";

const repoPath = path.resolve(process.cwd());
const loonygitPath = path.join(repoPath, APP_NAME);
const objectsPath = path.join(loonygitPath, "objects");
const refsPath = path.join(loonygitPath, "refs");
const headsPath = path.join(refsPath, "heads");
const tagsPath = path.join(refsPath, "tags");
const headPath = path.join(loonygitPath, "HEAD");
const configPath = path.join(loonygitPath, "config");
const globalConfigPath = path.join(os.homedir(), GLOBAL_CONFIG_NAME);
const localConfigPath = path.join(loonygitPath, LOCAL_CONFIG_NAME);
const loonyignorePath = path.join(repoPath, APP_IGNORE_NAME);
const indexPath = path.join(loonygitPath, "index");
const branchesPath = path.join(loonygitPath, "refs", "heads");

export {
  repoPath,
  loonygitPath,
  objectsPath,
  refsPath,
  headsPath,
  tagsPath,
  headPath,
  configPath,
  indexPath,
  branchesPath,
  localConfigPath,
  globalConfigPath,
  loonyignorePath,
};
