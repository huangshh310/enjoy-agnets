/**
 * 超大 MCP App：面上只留中性提示，不带字数、不带 srcDoc。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { markMcpAppTooLarge, mcpAppSurface } from "./mcp-app-surface.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enChat } from "../i18n/catalogs/en/chat.ts"

test("tooLarge 走提示面，不把 srcDoc 或字数交给 iframe", () => {
  const surface = mcpAppSurface({
    serverId: "acp",
    resourceUri: "ui://huge",
    srcDoc: "",
    tooLarge: true
  })
  assert.equal(surface.kind, "too_large")
  assert.equal(zhChat.mcpAppTooLarge, "这个应用界面太大，没法在这里打开。")
  assert.equal(enChat.mcpAppTooLarge, "This app UI is too large to open here.")
  assert.doesNotMatch(zhChat.mcpAppTooLarge, /\d/)
  assert.doesNotMatch(enChat.mcpAppTooLarge, /\d/)
})

test("有 srcDoc 才出 iframe；空错误占位先藏着", () => {
  assert.equal(
    mcpAppSurface({
      serverId: "acp",
      resourceUri: "ui://dash",
      srcDoc: "<p>ok</p>"
    }).kind,
    "frame"
  )
  assert.equal(
    mcpAppSurface({
      serverId: "acp",
      resourceUri: "ui://dash",
      srcDoc: ""
    }).kind,
    "hidden"
  )
})

test("警告把本轮空占位标成超大，没有占位就补一条", () => {
  const existing = {
    mcpApps: [{ serverId: "acp", resourceUri: "ui://huge", srcDoc: "" }]
  }
  markMcpAppTooLarge(existing)
  assert.equal(existing.mcpApps[0]?.tooLarge, true)
  assert.equal(existing.mcpApps[0]?.srcDoc, "")

  const fresh: { mcpApps?: Array<{ tooLarge?: boolean; srcDoc: string }> } = {}
  markMcpAppTooLarge(fresh)
  assert.equal(fresh.mcpApps?.[0]?.tooLarge, true)
  assert.equal(fresh.mcpApps?.[0]?.srcDoc, "")
})
