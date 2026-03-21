const { TreeManager } = require("../dist/core/tree");
const { ObjectStore } = require("../dist/core/object-store");
const { Index } = require("../dist/core/index");

/**
 * Simple logger helpers for nicer DX
 */
const log = {
  section: (title) => {
    console.log(`\n==================== ${title} ====================`);
  },
  info: (msg) => {
    console.log(`ℹ️  ${msg}`);
  },
  success: (msg) => {
    console.log(`✅ ${msg}`);
  },
  warn: (msg) => {
    console.warn(`⚠️  ${msg}`);
  },
  error: (msg) => {
    console.error(`❌ ${msg}`);
  },
  tree: (depth, msg) => {
    const indent = "  ".repeat(depth);
    console.log(`${indent}📁 ${msg}`);
  },
  file: (depth, msg) => {
    const indent = "  ".repeat(depth);
    console.log(`${indent}📄 ${msg}`);
  },
};

function getRootHashFromArgs() {
  const [, , rootHash] = process.argv;

  if (!rootHash) {
    log.section("Usage");
    log.warn("Missing root tree hash.");
    console.log("👉 Example:");
    console.log("   node run.js <tree-hash>");
    console.log("   node run.js 85d4c50e6193d5b910be05160936e0e1be467bfb\n");
    process.exit(1);
  }

  return rootHash;
}

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
    const __tree = await treeManager.buildTreeFromPath(entries);
    console.log(__tree);
  } catch (err) {
    log.section("Fatal Error");
    log.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
