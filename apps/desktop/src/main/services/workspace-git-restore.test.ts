import assert from "node:assert/strict"
import { test } from "node:test"
import { assertHasRestoreTargets, partitionRestorePaths } from "./workspace-git-restore-split.ts"

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

test("对不上 porcelain 时抛 RESTORE_NOTHING_MATCHED，禁止空转成功", () => {
  const empty = partitionRestorePaths(["gone.ts"], [{ path: "src/a.ts", status: "modified" }])
  assert.deepEqual(empty, { tracked: [], untracked: [] })
  assert.throws(() => assertHasRestoreTargets(empty), /RESTORE_NOTHING_MATCHED/)
  assertHasRestoreTargets({ tracked: ["src/a.ts"], untracked: [] })
})
