import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewFilesFromTools } from "./turn-changed-files.ts"

test("只收已执行写类，最多 3 个短名", () => {
  const files = reviewFilesFromTools([
    { name: "read_file", state: "output-available", args: { path: "a.ts" } },
    { name: "write_file", state: "output-available", args: { path: "src/one.ts" } },
    { name: "edit_file", state: "output-available", result: { path: "src/two.ts" } },
    { name: "write_file", state: "output-available", args: { path: "src/three.ts" } },
    { name: "write_file", state: "output-available", args: { path: "src/four.ts" } },
    { name: "write_file", state: "approval-requested", args: { path: "skip.ts" } }
  ])
  assert.deepEqual(files, { names: ["one.ts", "two.ts", "three.ts"], total: 4 })
})

test("没有写类则不带字段", () => {
  assert.equal(reviewFilesFromTools([{ name: "read_file", state: "output-available" }]), undefined)
})
