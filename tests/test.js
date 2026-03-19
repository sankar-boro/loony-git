const config = require("../dist/core/config");

(async () => {
  const Config = new config.Config();
  await Config.loadLocal();
  const allConfig = Config.listAll();
  //   console.log(allConfig);
  console.log(Config.get("user.name"));
  console.log(Config.get("remote.origin.url"));
})();
