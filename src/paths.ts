import fsPromises from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  APP_NAME,
  GLOBAL_CONFIG_NAME,
  LOCAL_CONFIG_NAME,
  APP_IGNORE_NAME,
} from "./values";

const repoPath = path.resolve(process.cwd());
const CWD = repoPath;
const loonygitPath = path.join(repoPath, APP_NAME);
const LOONY_GIT_PATH = loonygitPath;
const objectsPath = path.join(loonygitPath, "objects");
const OBJECTS = objectsPath;
const refsPath = path.join(loonygitPath, "refs");
const REFS = refsPath;
const headPath = path.join(loonygitPath, "HEAD");
const HEAD = headPath;
const indexPath = path.join(loonygitPath, "index");
const INDEX = indexPath;
const configPath = path.join(loonygitPath, "config");
const CONFIG = configPath;
//
const headsPath = path.join(refsPath, "heads");
const Heads = headsPath;
const tagsPath = path.join(refsPath, "tags");
const Tags = tagsPath;
//
const globalConfigPath = path.join(os.homedir(), GLOBAL_CONFIG_NAME);
const localConfigPath = path.join(loonygitPath, LOCAL_CONFIG_NAME);
const loonyignorePath = path.join(repoPath, APP_IGNORE_NAME);
const branchesPath = path.join(loonygitPath, "refs", "heads");
const getHeadRef = async () =>
  (await fsPromises.readFile(headPath, "utf-8")).trim();
const getRefPath = async () => {
  let headRef = await getHeadRef();
  return path.join(repoPath, ".loonygit", headRef.slice(5));
};
const getLocalCommit = async () => {
  const headRef = (await fsPromises.readFile(headPath, "utf-8")).trim();
  const refPath = path.join(repoPath, ".loonygit", headRef.slice(5));
  return (await fsPromises.readFile(refPath, "utf-8")).trim();
};

const getCurrentHash = getLocalCommit;

export {
  CWD,
  LOONY_GIT_PATH,
  OBJECTS,
  REFS,
  HEAD,
  INDEX,
  Heads,
  Tags,
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
  getHeadRef,
  getRefPath,
  getLocalCommit,
  getCurrentHash,
};
