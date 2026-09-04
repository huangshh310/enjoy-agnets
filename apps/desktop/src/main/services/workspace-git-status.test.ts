/**
 * porcelain XY：不 trim 前两列。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { parsePorcelainLine } from "./workspace-git-status.ts"

const empty = new Map<string, { additions: number; deletions: number }>()

test("parsePorcelainLine 区分未暂存 M 与已暂存 M", () => {
  const unstaged = parsePorcelainLine(" M src/a.ts", empty)
  assert.equal(unstaged?.staged, false)
  assert.equal(unstaged?.worktree, true)
  assert.equal(unstaged?.status, "modified")

  const staged = parsePorcelainLine("M  src/a.ts", empty)
  assert.equal(staged?.staged, true)
  assert.equal(staged?.worktree, false)
  assert.equal(staged?.status, "modified")
})

test("parsePorcelainLine 识别 MM 与未跟踪", () => {
  const both = parsePorcelainLine("MM src/a.ts", empty)
  assert.equal(both?.staged, true)
  assert.equal(both?.worktree, true)

  const untracked = parsePorcelainLine("?? new.ts", empty)
  assert.equal(untracked?.status, "untracked")
  assert.equal(untracked?.staged, false)
  assert.equal(untracked?.worktree, true)
})

test("parsePorcelainLine 过短行返回 null", () => {
  assert.equal(parsePorcelainLine("M", empty), null)
  assert.equal(parsePorcelainLine("", empty), null)
})
