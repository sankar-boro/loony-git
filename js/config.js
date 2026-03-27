const LOONYGIT_DIR = process.cwd() + "/.loonygit";

let LOONY_CONFIG = "";
let LOONY_INDEX = "";
let LOONY_HEAD = "";
let LOONY_OBJECTS = "";
let LOONY_REFS = "";
let heads = "";
let tags = "";
let main_head = "";

(async () => {
  LOONY_CONFIG = LOONYGIT_DIR + "/" + "config";
  LOONY_INDEX = LOONYGIT_DIR + "/" + "index";
  LOONY_HEAD = LOONYGIT_DIR + "/" + "HEAD";
  LOONY_OBJECTS = LOONYGIT_DIR + "/" + "objects";
  LOONY_REFS = LOONYGIT_DIR + "/" + "refs";
  //
  heads = LOONYGIT_DIR + "/" + "refs" + "/" + "heads";
  tags = LOONYGIT_DIR + "/" + "refs" + "/" + "tags";
  //
  main_head = LOONYGIT_DIR + "/" + "refs" + "/" + "heads" + "/" + "main";
})();

export {
  LOONY_CONFIG as CONFIG,
  LOONY_INDEX as INDEX,
  LOONY_HEAD as HEAD,
  LOONY_OBJECTS as OBJECTS,
  LOONY_REFS as REFS,
  heads,
  tags,
  main_head,
};
