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
