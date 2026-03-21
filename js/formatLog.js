const importconfig = require("../dist/core/config");
const { Config } = importconfig;

async function run() {
  const config = new Config();
  await config.loadLocal();
  const allConfig = config.listAll();

  // log
  console.log(allConfig);

  //
  console.log("user.name\t\t\t", config.get("user.name"));
  console.log("user.email\t\t\t", config.get("user.email"));
  console.log("remote.origin.url\t\t", config.get("remote.origin.url"));

  //
  console.log(
    "user.name: %s\nuser.email: %s\nremote.origin.url: %s",
    config.get("user.name"),
    config.get("user.email"),
    config.get("remote.origin.url"),
  );

  //
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
