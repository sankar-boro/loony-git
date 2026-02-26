import { describe, test, expect } from "vitest";
import { TreeManager } from "../dist/core/tree.js";
import { createHash } from "crypto";

/**
 * In-memory ObjectStore mock.
 * Simulates Git-like object storage without touching disk.
 */
class MockObjectStore {
  constructor() {
    this.mapstore = new Map();
  }

  async store(content, type) {
    const hash = createHash("sha1")
      .update(type + "\0" + content)
      .digest("hex");

    this.mapstore.set(hash, { type, content });
    return hash;
  }

  async read(hash) {
    const obj = this.mapstore.get(hash);
    if (!obj) throw new Error(`Object not found: ${hash}`);
    return obj;
  }
}

describe("TreeManager (CommonJS)", () => {
  test("createTree + readTree roundtrip", async () => {
    const objectStore = new MockObjectStore();
    const treeManager = new TreeManager(objectStore);

    const entries = [
      { name: "b.txt", mode: "100644", hash: "b".repeat(40) },
      { name: "a.txt", mode: "100644", hash: "a".repeat(40) },
    ];

    const tree = await treeManager.createTree(entries);
    const readTree = await treeManager.readTree(tree.hash);

    expect(readTree.entries).toEqual([
      { name: "a.txt", mode: "100644", hash: "a".repeat(40) },
      { name: "b.txt", mode: "100644", hash: "b".repeat(40) },
    ]);
  });

  test("tree hash is deterministic regardless of input order", async () => {
    const objectStore = new MockObjectStore();
    const treeManager = new TreeManager(objectStore);

    const entries1 = [
      { name: "b.txt", mode: "100644", hash: "b".repeat(40) },
      { name: "a.txt", mode: "100644", hash: "a".repeat(40) },
    ];

    const entries2 = [
      { name: "a.txt", mode: "100644", hash: "a".repeat(40) },
      { name: "b.txt", mode: "100644", hash: "b".repeat(40) },
    ];

    const tree1 = await treeManager.createTree(entries1);
    const tree2 = await treeManager.createTree(entries2);

    expect(tree1.hash).toBe(tree2.hash);
  });

  test("buildTreeFromPath builds nested trees", async () => {
    const objectStore = new MockObjectStore();
    const treeManager = new TreeManager(objectStore);

    const entries = new Map([
      ["src/app.ts", { hash: "a".repeat(40), mode: "100644" }],
      ["src/utils.ts", { hash: "b".repeat(40), mode: "100644" }],
      ["README.md", { hash: "c".repeat(40), mode: "100644" }],
    ]);

    const rootTree = await treeManager.buildTreeFromPath(entries);

    const names = rootTree.entries.map((e) => e.name).sort();
    expect(names).toEqual(["README.md", "src"]);
  });

  test("flattenTree reconstructs file paths", async () => {
    const objectStore = new MockObjectStore();
    const treeManager = new TreeManager(objectStore);

    const entries = new Map([
      ["src/app.ts", { hash: "a".repeat(40), mode: "100644" }],
      ["src/utils.ts", { hash: "b".repeat(40), mode: "100644" }],
      ["README.md", { hash: "c".repeat(40), mode: "100644" }],
    ]);

    const rootTree = await treeManager.buildTreeFromPath(entries);
    const flat = await treeManager.flattenTree(rootTree.hash);

    expect(flat.get("src/app.ts")).toBe("a".repeat(40));
    expect(flat.get("src/utils.ts")).toBe("b".repeat(40));
    expect(flat.get("README.md")).toBe("c".repeat(40));
  });

  // test("flatten(buildTreeFromPath(x)) === x (roundtrip invariant)", async () => {
  //   const objectStore = new MockObjectStore();
  //   const treeManager = new TreeManager(objectStore);

  //   const input = new Map([
  //     ["a/b/c.txt", { hash: "1".repeat(40), mode: "100644" }],
  //     ["a/b/d.txt", { hash: "2".repeat(40), mode: "100644" }],
  //     ["x.txt", { hash: "3".repeat(40), mode: "100644" }],
  //   ]);

  //   const tree = await treeManager.buildTreeFromPath(input);
  //   const flat = await treeManager.flattenTree(tree.hash);

  //   expect([...flat.entries()].sort()).toEqual([...input.entries()].sort());
  // });

  test("single file produces valid root tree", async () => {
    const objectStore = new MockObjectStore();
    const treeManager = new TreeManager(objectStore);

    const entries = new Map([
      ["hello.txt", { hash: "d".repeat(40), mode: "100644" }],
    ]);

    const rootTree = await treeManager.buildTreeFromPath(entries);

    expect(rootTree.entries.length).toBe(1);
    expect(rootTree.entries[0].name).toBe("hello.txt");
  });
});
