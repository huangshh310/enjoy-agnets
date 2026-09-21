import assert from "node:assert/strict"
import { test } from "node:test"
import { isOverlayModule, isWorkModule, matchAppModule, pathForWorkModule } from "./match-module.ts"

test("工作模块按前缀命中", () => {
  assert.equal(matchAppModule("/"), "chat")
  assert.equal(matchAppModule("/knowledge"), "knowledge")
  assert.equal(matchAppModule("/workflows"), "workflows")
  assert.equal(matchAppModule("/media"), "media")
  assert.equal(matchAppModule("/mcp"), "mcp")
  assert.equal(matchAppModule("/skills"), "skills")
  assert.equal(matchAppModule("/extensions"), "settings")
})

test("Inbox / Settings 是叠加模块，包含 Observability", () => {
  assert.equal(matchAppModule("/inbox"), "inbox")
  assert.equal(matchAppModule("/settings/general"), "settings")
  assert.equal(matchAppModule("/observability"), "settings")
  assert.equal(matchAppModule("/automations"), "chat")
  assert.equal(matchAppModule("/kanban"), "chat")
  assert.equal(matchAppModule("/settings/automations"), "settings")
  assert.equal(matchAppModule("/team/profile"), "settings")
  assert.equal(matchAppModule("/workspaces"), "settings")
  assert.equal(isOverlayModule("inbox"), true)
  assert.equal(isWorkModule("settings"), false)
})

test("工作模块路径表完整", () => {
  assert.equal(pathForWorkModule("chat"), "/")
  assert.equal(pathForWorkModule("knowledge"), "/knowledge")
  assert.equal(pathForWorkModule("mcp"), "/mcp")
  assert.equal(pathForWorkModule("skills"), "/skills")
})
