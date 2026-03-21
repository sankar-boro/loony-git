const { Index } = require("./core/index");

async function run() {
  try {
    const index = new Index();
    await index.load();
    const allIndexes = index.getAll();
    console.log(allIndexes);
  } catch (err) {
    console.error(err.stack || err.message || err);
    process.exit(1);
  }
}

run();
