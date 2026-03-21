const { Index } = require("./core/index");
const { log } = require("./utils");
const { buildTreeFromPath } = require("./core/treeManager");

async function run() {
  try {
    const index = new Index();

    await index.load();
    const allIndexes = index.getAll();

    const entries = new Map();

    for (const entry of allIndexes) {
      entries.set(entry.path, {
        hash: entry.hash,
        mode: entry.mode,
      });
    }
    const __tree = await buildTreeFromPath(entries);
    console.log(__tree);
  } catch (err) {
    log.section("Fatal Error");
    log.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
