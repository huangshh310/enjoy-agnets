import assert from "node:assert/strict"
import { test } from "node:test"
import { displaySkillDescription } from "./skill-description.ts"

test("空 YAML 折叠标回落到 fallback", () => {
  assert.equal(displaySkillDescription(">-", "fallback"), "fallback")
  assert.equal(displaySkillDescription("|", "fallback"), "fallback")
  assert.equal(displaySkillDescription("  ", "fallback"), "fallback")
  assert.equal(displaySkillDescription("Ask which skill fits.", "fallback"), "Ask which skill fits.")
})
