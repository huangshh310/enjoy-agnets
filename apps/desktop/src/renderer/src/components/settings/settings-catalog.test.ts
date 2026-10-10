/**
 * 设置侧栏智能体分组必须露出 skills 入口；点它停在设置壳，不能并进「说明」。
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

test("设置侧栏智能体分组包含内置工具入口", () => {
  const agent = SETTINGS_NAV_DEF.find((group) => group.id === "agent")
  assert.ok(agent)
  assert.ok(agent.items.some((item) => item.id === "tools"))
  assert.equal(resolveActiveNavSectionId("tools"), "tools")
})

test("应用组含已归档，打开时高亮自己而不是个人资料", () => {
  const app = SETTINGS_NAV_DEF.find((group) => group.id === "app")
  assert.ok(app)
  assert.ok(app.items.some((item) => item.id === "archived"))
  assert.equal(resolveActiveNavSectionId("archived"), "archived")
})

test("设置侧栏工作区组是工作区 / 扩展 / MCP", () => {
  const workspace = SETTINGS_NAV_DEF.find((group) => group.id === "workspace")
  assert.ok(workspace)
  assert.deepEqual(
    workspace.items.map((item) => item.id),
    ["workspace", "extensions", "mcp"]
  )
})

test("组织一级入口是个人资料，团队空态不高亮自己", () => {
  const org = SETTINGS_NAV_DEF.find((group) => group.id === "org")
  assert.ok(org)
  assert.ok(org.items.some((item) => item.id === "account"))
  assert.equal(org.items.some((item) => item.id === "team"), false)
  assert.equal(resolveActiveNavSectionId("account"), "account")
  assert.equal(resolveActiveNavSectionId("team"), "account")
})

test("侧栏每一级入口只高亮自己，遥测不再并进 MCP", () => {
  const ids = SETTINGS_NAV_DEF.flatMap((group) => group.items.map((item) => item.id))
  assert.ok(ids.includes("telemetry"))
  assert.ok(ids.includes("mcp"))
  for (const id of ids) {
    assert.equal(resolveActiveNavSectionId(id), id, `${id} 应高亮自己`)
  }
  assert.equal(resolveActiveNavSectionId("telemetry"), "telemetry")
  assert.notEqual(resolveActiveNavSectionId("automations"), "mcp")
  assert.notEqual(resolveActiveNavSectionId("git"), "mcp")
})
