import assert from "node:assert/strict"
import { test } from "node:test"
import { partitionRestorePaths } from "./workspace-git-restore-split.ts"

test("已跟踪与未跟踪分开，忽略不在 status 里的 path", () => {
  const split = partitionRestorePaths(
    ["src/a.ts", "tmp/new.ts", "gone.ts", "src/a.ts"],
    [
      { path: "src/a.ts", status: "modified" },
      { path: "tmp/new.ts", status: "untracked" }
    ]
  )
  assert.deepEqual(split.tracked, ["src/a.ts"])
  assert.deepEqual(split.untracked, ["tmp/new.ts"])
})
