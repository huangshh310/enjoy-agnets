/**
 * 页面 id：同一会话再点不变；设置分段、知识路径、看板要和会话分开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveHistoryEntry, historyPathname, materializeEntry } from "./derive-entry.ts"
import type { PageSnapshot } from "./derive-entry.ts"

function snap(partial: Partial<PageSnapshot>): PageSnapshot {
  return {
    pathname: "/",
    search: {},
    sessionId: null,
    sessionTitle: "",
    workspaceId: null,
    workspaceName: "",
    ...partial
  }
}

test("会话页用会话 id，再点同一会话 id 不变", () => {
  const first = deriveHistoryEntry(snap({ sessionId: "s1", sessionTitle: "甲", workspaceId: "w1" }))
  const again = deriveHistoryEntry(snap({ sessionId: "s1", sessionTitle: "甲改", workspaceId: "w1" }))
  assert.equal(first.id, "session:s1")
  assert.equal(again.id, first.id)
  assert.equal(materializeEntry(again, (key) => key).title, "甲改")
})

test("没有会话时用项目 id，都没有则是新聊天", () => {
  assert.equal(deriveHistoryEntry(snap({ workspaceId: "w1", workspaceName: "库" })).id, "workspace:w1")
  assert.equal(deriveHistoryEntry(snap({})).id, "chat:new")
})

test("看板和自动化不跟当前会话混成一页", () => {
  const kanban = deriveHistoryEntry(snap({ pathname: "/kanban", sessionId: "s1" }))
  const autos = deriveHistoryEntry(snap({ pathname: "/automations", sessionId: "s1" }))
  assert.equal(kanban.id, "route:/kanban")
  assert.equal(autos.id, "route:/automations")
  assert.notEqual(kanban.id, "session:s1")
})

test("设置分段是一页，tab 分开，tool 和 from 不算新页", () => {
  const appearance = deriveHistoryEntry(snap({ pathname: "/settings/appearance", search: { tool: "cursor", from: "dock" } }))
  const agent = deriveHistoryEntry(snap({ pathname: "/settings/agent", search: { tab: "local", tool: "x" } }))
  const agentAgain = deriveHistoryEntry(snap({ pathname: "/settings/agent", search: { tab: "local", from: "y" } }))
  assert.equal(appearance.id, "settings:appearance")
  assert.equal(agent.id, "settings:agent:local")
  assert.equal(agentAgain.id, agent.id)
  assert.equal(historyPathname(materializeEntry(appearance, (key) => key)), "/settings/appearance")
})

test("知识路径算一页，只改搜索词不算", () => {
  const base = deriveHistoryEntry(snap({ pathname: "/knowledge", search: { q: "a" } }))
  const same = deriveHistoryEntry(snap({ pathname: "/knowledge", search: { q: "b" } }))
  const file = deriveHistoryEntry(snap({ pathname: "/knowledge", search: { path: "docs/readme.md", q: "b" } }))
  assert.equal(base.id, same.id)
  assert.equal(file.id, "knowledge:docs/readme.md")
  assert.equal(materializeEntry(file, (key) => key).title, "readme.md")
  assert.deepEqual(file.params.search, { path: "docs/readme.md" })
})

test("技能和 MCP 的 tab 分开，install 和 preset 不进 id", () => {
  const skills = deriveHistoryEntry(snap({ pathname: "/skills", search: { tab: "packs", install: "x" } }))
  const mcp = deriveHistoryEntry(snap({ pathname: "/mcp", search: { tab: "json", preset: "fs" } }))
  assert.equal(skills.id, "skills:packs")
  assert.equal(mcp.id, "mcp:json")
  assert.equal(skills.params.search?.install, undefined)
  assert.equal(mcp.params.search?.preset, undefined)
})
