export const log = {
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

export const getRootHashFromArgs = () => {
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
};

const walkTree = async (treeManager, treeHash, prefix = "", depth = 0) => {
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
};
