import { store, read } from "./objectStore.js";
async function createTree(entries) {
  const sortedEntries = [...entries].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const content = Buffer.concat(
    sortedEntries.map((entry) =>
      Buffer.concat([
        Buffer.from(entry.mode, "utf-8"),
        Buffer.from(" "),
        Buffer.from(entry.name, "utf-8"),
        Buffer.from([0]),
        Buffer.from(entry.hash, "hex"),
      ]),
    ),
  );
  const hash = await store(content, "tree");
  return { type: "tree", entries: sortedEntries, hash };
}
async function readTree(hash) {
  const { type, content } = await read(hash);
  if (type !== "tree") {
    throw new Error(`Object ${hash} is not a tree`);
  }
  const entries = [];
  let offset = 0;
  while (offset < content.length) {
    const modeEnd = content.indexOf(32, offset);
    const mode = content.slice(offset, modeEnd).toString("utf-8");
    const nameStart = modeEnd + 1;
    const nameEnd = content.indexOf(0, nameStart);
    const name = content.slice(nameStart, nameEnd).toString("utf-8");
    const hashStart = nameEnd + 1;
    const entryHash = content.slice(hashStart, hashStart + 20).toString("hex");
    entries.push({ mode, name, hash: entryHash });
    offset = hashStart + 20;
  }
  return { type: "tree", entries, hash };
}
async function buildTreeFromPath(entries) {
  const treeMap = new Map();
  for (const [filePath, value] of entries) {
    const parts = filePath.split("/");
    const fileName = parts.pop();
    const dirPath = parts.join("/");
    if (!treeMap.has(dirPath)) treeMap.set(dirPath, new Map());
    treeMap.get(dirPath).set(fileName, value);
  }
  const cache = new Map();
  const build = async (dir) => {
    if (cache.has(dir)) return cache.get(dir);
    const treeEntries = [];
    const files = treeMap.get(dir);
    if (files) {
      for (const [name, value] of files) {
        treeEntries.push({ name, ...value });
      }
    }
    const prefix = dir ? dir + "/" : "";
    const subdirs = new Set();
    for (const key of treeMap.keys()) {
      if (!key.startsWith(prefix) || key === dir) continue;
      const rest = key.slice(prefix.length);
      subdirs.add(rest.split("/")[0]);
    }
    for (const subdir of subdirs) {
      const subPath = dir ? `${dir}/${subdir}` : subdir;
      const subHash = await build(subPath);
      treeEntries.push({
        name: subdir,
        mode: "040000",
        hash: subHash,
      });
    }
    const tree = await createTree(treeEntries);
    cache.set(dir, tree.hash);
    return tree.hash;
  };
  const rootHash = await build("");
  return readTree(rootHash);
}
async function flattenTree(hash, prefix = "", out = new Map()) {
  const tree = await readTree(hash);
  for (const entry of tree.entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.mode === "040000") {
      await flattenTree(entry.hash, fullPath, out);
    } else {
      out.set(fullPath, entry.hash);
    }
  }
  return out;
}
export { createTree, readTree, buildTreeFromPath, flattenTree };