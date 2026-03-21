const importconfig = require("../dist/core/config");
const { Config } = importconfig;

async function run() {
  const config = new Config();
  await config.loadLocal();
  const allConfig = config.listAll();

  // log
  console.log(allConfig);

  const entries = [
    ["user.name", config.get("user.name")],
    ["user.email", config.get("user.email")],
    ["remote.origin.url", config.get("remote.origin.url")],
  ];

  entries.forEach(([key, value]) => {
    console.log(key.padEnd(25), value);
  });
}

run();
