import assert from "node:assert/strict"
import { test } from "node:test"
import { expandDirectories, sortEntries, type DirEntry } from "./files-entries.ts"

test("sorts directories before files", () => {
  const rows = sortEntries([
    { name: "b.ts", path: "b.ts", kind: "file" },
    { name: "a", path: "a", kind: "directory" }
  ])
  assert.deepEqual(rows.map((row) => row.name), ["a", "b.ts"])
})

test("expandDirectories opens nested folders up to the limit", async () => {
  const catalog: Record<string, DirEntry[]> = {
    src: [
      { name: "lib", path: "src/lib", kind: "directory" },
      { name: "main.ts", path: "src/main.ts", kind: "file" }
    ],
    "src/lib": [{ name: "util.ts", path: "src/lib/util.ts", kind: "file" }]
  }
  const next = await expandDirectories(
    [{ name: "src", path: "src", kind: "directory" }],
    {},
    async (path) => catalog[path] ?? []
  )
  assert.equal(next.open.has("src"), true)
  assert.equal(next.open.has("src/lib"), true)
  assert.equal(next.children["src"]?.length, 2)
})
