/**
 * 技能源全量拉取结果：必须带 skippedCount，禁止只报 updatedCount。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { SkillSourceUpdateAllResult } from "./skill-sources.ts"

test("SkillSourceUpdateAllResult 接受 skippedCount 与 errors", () => {
  const parsed = SkillSourceUpdateAllResult.parse({
    updatedCount: 0,
    skippedCount: 2,
    errors: []
  })
  assert.equal(parsed.skippedCount, 2)
})

test("SkillSourceUpdateAllResult 缺 skippedCount 则拒", () => {
  assert.throws(() =>
    SkillSourceUpdateAllResult.parse({
      updatedCount: 1,
      errors: []
    })
  )
})

test("SkillTargetId 覆盖全部 13 款原生 CLI 智能体目标", async () => {
  const { SkillTargetId } = await import("./skill-sources.ts")
  const expectedCliTargets = [
    "enjoy-agents",
    "claude",
    "cursor",
    "grok",
    "codex",
    "antigravity",
    "gemini",
    "opencode",
    "pi",
    "omp",
    "hermes",
    "amp",
    "deepseek"
  ]
  for (const target of expectedCliTargets) {
    assert.equal(SkillTargetId.parse(target), target)
  }
})
