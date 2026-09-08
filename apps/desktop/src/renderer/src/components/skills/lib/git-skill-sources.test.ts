/**
 * 可选拉取门闩：无 Git 源 / 已跳过 / 已拉过都不展示。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  countGitSkillSources,
  shouldOfferSkillSourcePull,
  summarizePullResult
} from "./git-skill-sources.ts"

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

test("shouldOfferSkillSourcePull 在无源、跳过或已拉时关闭", () => {
  assert.equal(shouldOfferSkillSourcePull({ gitCount: 2, dismissed: false, pulled: false }), true)
  assert.equal(shouldOfferSkillSourcePull({ gitCount: 0, dismissed: false, pulled: false }), false)
  assert.equal(shouldOfferSkillSourcePull({ gitCount: 1, dismissed: true, pulled: false }), false)
  assert.equal(shouldOfferSkillSourcePull({ gitCount: 1, dismissed: false, pulled: true }), false)
})

test("summarizePullResult 区分成功 / 部分失败 / 无可拉", () => {
  assert.equal(summarizePullResult({ updatedCount: 2, errors: [] }), "ok")
  assert.equal(summarizePullResult({ updatedCount: 1, errors: ["repo: GIT_PULL_FAILED"] }), "partial")
  assert.equal(summarizePullResult({ updatedCount: 0, errors: [] }), "empty")
})
