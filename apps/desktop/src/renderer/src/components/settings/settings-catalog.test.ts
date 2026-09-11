/**
 * 设置侧栏智能体分组必须露出 skills 入口；点它会 redirect 到 `#/skills`，不能并进「说明」。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { SETTINGS_NAV_DEF } from "./settings-catalog-nav.ts"
import { resolveActiveNavSectionId } from "./settings-nav-resolve.ts"

test("设置侧栏智能体分组包含技能入口", () => {
  const agent = SETTINGS_NAV_DEF.find((group) => group.id === "agent")
  assert.ok(agent)
  assert.ok(agent.items.some((item) => item.id === "skills"))
})

test("打开 skills 时侧栏高亮技能自身而不是说明", () => {
  assert.equal(resolveActiveNavSectionId("skills"), "skills")
})

test("组织一级入口是个人资料，团队空态不高亮自己", () => {
  const org = SETTINGS_NAV_DEF.find((group) => group.id === "org")
  assert.ok(org)
  assert.ok(org.items.some((item) => item.id === "account"))
  assert.equal(org.items.some((item) => item.id === "team"), false)
  assert.equal(resolveActiveNavSectionId("account"), "account")
  assert.equal(resolveActiveNavSectionId("team"), "account")
})
