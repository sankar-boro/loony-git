import path from "path";
import fs from "fs/promises";

const __1 = path.resolve("src");
console.log(__1);

const __2 = path.relative("./", "./src");
console.log(__2);

const y = path.relative(".", ".");
// const x = await fs.readFile(y, "utf-8");

console.log(y);
