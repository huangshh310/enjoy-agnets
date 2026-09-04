import assert from "node:assert/strict"
import { test } from "node:test"
import { filterChangesByScope } from "./filter-review-changes.ts"

type Row = {
  path: string
  status: "added" | "modified" | "deleted" | "untracked"
  additions: number
  deletions: number
  staged?: boolean
  worktree?: boolean
}

function row(path: string, extra: Partial<Row> = {}): Row {
  return {
    path,
    status: "modified",
    additions: 1,
    deletions: 0,
    staged: false,
    worktree: true,
    ...extra
  }
}

test("unstaged 只留工作区改动", () => {
  const files = [
    row("a.ts", { staged: true, worktree: false }),
    row("b.ts", { staged: false, worktree: true })
  ]
  const next = filterChangesByScope(files, "unstaged", [], [])
  assert.deepEqual(
    next.map((f) => f.path),
    ["b.ts"]
  )
})

test("last-turn 按路径交集", () => {
  const files = [row("a.ts"), row("b.ts")]
  const next = filterChangesByScope(files, "last-turn", ["b.ts"], [])
  assert.deepEqual(
    next.map((f) => f.path),
    ["b.ts"]
  )
})

test("branch 合并上游文件与工作区", () => {
  const working = [row("a.ts", { additions: 3 })]
  const branch = [row("a.ts", { additions: 1 }), row("c.ts")]
  const next = filterChangesByScope(working, "branch", [], branch)
  assert.equal(next.length, 2)
  assert.equal(next.find((f) => f.path === "a.ts")?.additions, 3)
})
