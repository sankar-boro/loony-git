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

async function walkTree(treeManager, treeHash, prefix = "", depth = 0) {
  log.info(`Reading tree: ${treeHash}`);

  const tree = await treeManager.readTree(treeHash);

  if (tree.type !== "tree") {
    throw new Error(`Expected tree, got ${tree.type} (${treeHash})`);
  }

  for (const entry of tree.entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.mode === "040000") {
      log.tree(depth, fullPath);
      await walkTree(treeManager, entry.hash, fullPath, depth + 1);
    } else {
      log.file(depth, fullPath);
    }
  }
}

async function run() {
  try {
    log.section("Bootstrapping");

    const rootHash = getRootHashFromArgs();
    log.info(`Root tree hash: ${rootHash}`);

    const index = new Index();
    const objectStore = new ObjectStore();
    const treeManager = new TreeManager(objectStore);

    log.section("Loading Index");
    await index.load();
    const allIndexes = index.getAll();
    log.success(`Loaded ${allIndexes.length} index entries`);

    log.section("Building Tree");
    const entries = new Map();

    for (const entry of allIndexes) {
      entries.set(entry.path, {
        hash: entry.hash,
        mode: entry.mode,
      });
    }

    log.success(`Prepared ${entries.size} entries for tree build`);
    await treeManager.buildTreeFromPath(entries);
    log.success("Tree built successfully");

    log.section("Walking Tree");
    await walkTree(treeManager, rootHash);

    log.section("Done");
    log.success("Tree traversal complete 🎉");
  } catch (err) {
    log.section("Fatal Error");
    log.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
