import assert from "node:assert/strict"
import { test } from "node:test"
import { collectSessionFiles } from "./collect-session-files.ts"

test("按上一轮 path 列文件，并贴上 Git 增减", () => {
  const files = collectSessionFiles(
    ["src/a.ts", "src/a.ts", "./src/b.ts"],
    [
      { path: "src/a.ts", status: "modified", additions: 4, deletions: 1 },
      { path: "other.ts", status: "modified", additions: 9, deletions: 2 }
    ]
  )
  assert.deepEqual(files, [
    { path: "src/a.ts", name: "a.ts", dir: "src", additions: 4, deletions: 1 },
    { path: "src/b.ts", name: "b.ts", dir: "src", additions: 0, deletions: 0 }
  ])
})

test("相对路径后缀也能对上 Git 行", () => {
  const files = collectSessionFiles(
    ["b.ts"],
    [{ path: "apps/desktop/src/b.ts", status: "added", additions: 3, deletions: 0 }]
  )
  assert.equal(files[0]?.additions, 3)
  assert.equal(files[0]?.path, "apps/desktop/src/b.ts")
})
