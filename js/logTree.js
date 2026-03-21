const { TreeManager } = require("../dist/core/tree");
const { ObjectStore } = require("../dist/core/object-store");
const { Index } = require("../dist/core/index");
const { log } = require("./utils");
const { buildTreeFromPath } = require("./treeManager");

async function run() {
  try {
    const index = new Index();
    const objectStore = new ObjectStore();
    const treeManager = new TreeManager(objectStore);

    await index.load();
    const allIndexes = index.getAll();

    const entries = new Map();

    for (const entry of allIndexes) {
      entries.set(entry.path, {
        hash: entry.hash,
        mode: entry.mode,
      });
    }
    const __tree = await buildTreeFromPath(objectStore, entries);
    console.log(__tree);
  } catch (err) {
    log.section("Fatal Error");
    log.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
