/**
 * 可选更新门闩：只计 Git 源；失败/0 个都走「有源未更新」。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { countGitSkillSources, pullToastKind } from "./git-skill-sources.ts"

test("countGitSkillSources 只计 git，忽略本机发现组", () => {
  assert.equal(
    countGitSkillSources([
      { kind: "local" },
      { kind: "git" },
      { kind: "git" }
    ]),
    2
  )
  assert.equal(countGitSkillSources([{ kind: "local" }]), 0)
})

test("pullToastKind 成功才是 updated，其余 missed", () => {
  assert.equal(pullToastKind({ updatedCount: 2, errors: [] }), "updated")
  assert.equal(pullToastKind({ updatedCount: 1, errors: ["repo: GIT_PULL_FAILED"] }), "missed")
  assert.equal(pullToastKind({ updatedCount: 0, errors: [] }), "missed")
  assert.equal(pullToastKind(null), "missed")
})
