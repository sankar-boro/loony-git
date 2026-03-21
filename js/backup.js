import { Index } from "./core/index.js";
import { buildTreeFromPath } from "./core/treeManager.js";

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
    const index = new Index(process.cwd());
    log.section("Bootstrapping");

    const rootHash = getRootHashFromArgs();
    log.info(`Root tree hash: ${rootHash}`);

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
    const __tree = await buildTreeFromPath(entries);
    console.log(__tree);
    log.success("Tree built successfully");

    // log.section("Walking Tree");
    // await walkTree(treeManager, rootHash);

    // log.section("Done");
    // log.success("Tree traversal complete 🎉");
  } catch (err) {
    log.section("Fatal Error");
    log.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
