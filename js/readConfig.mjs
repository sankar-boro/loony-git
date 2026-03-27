import { serializeConfig, deserializeConfig } from "../dist/utils/index.js";
import fs from "fs/promises";

const config = {
  user: { name: "Sankar Boro", email: "sankar.boro@yahoo.com" },
  remote: {
    origin: {
      url: "https://loonygit.com/sankar-boro/hello.git",
    },
  },
};

async function testParseConfig() {
  const data = await fs.readFile("./.loonygit/config", "utf8");
  const res = deserializeConfig(data);
  console.log("Test parseConfig");
  console.log(res);
}
async function testSerializeConfig() {
  console.log("Test serializeConfig");
  const res = serializeConfig(config);
  console.log(res);
}
async function testSerializeConfig1() {
  console.log("Test serializeConfig 1");
  const res = serializeConfig(config);
  console.log(res);
}
async function testParseConfig1() {
  const data = await fs.readFile("./.loonygit/config", "utf8");
  const res = deserializeConfig(data);
  console.log("Test parseConfig1");
  console.log(res);
}

(async () => {
  await testParseConfig();
  console.log("\n\n");
  await testSerializeConfig();
  console.log("\n\n");
  await testParseConfig1();
  console.log("\n\n");
  await testSerializeConfig1();
})();
