import assert from "node:assert/strict"
import { test } from "node:test"
import { parseBranchList } from "./workspace-git-branches.ts"

test("解析 git branch --list，当前分支打标", () => {
  const rows = parseBranchList("* main\n  feat/ui\n  chore/docs\n", "main")
  assert.deepEqual(rows, [
    { name: "main", current: true },
    { name: "feat/ui", current: false },
    { name: "chore/docs", current: false }
  ])
})

test("空输出没有假 main", () => {
  assert.deepEqual(parseBranchList("", ""), [])
})
