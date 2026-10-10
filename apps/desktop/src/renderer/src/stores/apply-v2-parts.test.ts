import assert from "node:assert/strict"
import { test } from "node:test"
import { applyV2Part } from "./apply-v2-parts.ts"
import type { ThreadMessage } from "./chat-store.ts"

function assistant(): ThreadMessage {
  return {
    id: "msg_run_1",
    role: "assistant",
    content: "",
    createdAt: 1,
    streaming: true,
    reasoning: "",
    tools: []
  }
}

test("mcp.app 把 srcDoc 折进当前助手消息", () => {
  const next = assistant()
  const patch = applyV2Part([next], next, {
    type: "mcp.app",
    runId: "run_1",
    serverId: "acp",
    resourceUri: "ui://dash",
    phase: "open",
    srcDoc: "<p>app</p>",
    title: "Dash"
  })
  assert.equal(patch?.messages[0]?.mcpApps?.[0]?.resourceUri, "ui://dash")
  assert.ok(patch?.messages[0]?.mcpApps?.[0]?.srcDoc.includes("Content-Security-Policy"))
  assert.equal(patch?.thinkingLabel, "MCP App")
})

test("source.added 折进当前助手消息", () => {
  const next = assistant()
  const patch = applyV2Part([next], next, {
    type: "source.added",
    runId: "run_1",
    sourceId: "src_1",
    title: "readme",
    path: "README.md",
    startLine: 3,
    endLine: 5,
    snippet: "local first"
  })
  assert.equal(patch?.messages[0]?.sources?.[0]?.path, "README.md")
  assert.equal(patch?.messages[0]?.sources?.[0]?.endLine, 5)
  assert.equal(patch?.thinkingLabel, "Sources")
})

test("asset.created 与 structured.delta 折进同一轮", () => {
  const next = assistant()
  applyV2Part([next], next, {
    type: "asset.created",
    runId: "run_1",
    assetId: "ast_1",
    mediaType: "image/png",
    name: "shot.png",
    size: 12
  })
  const patch = applyV2Part([next], next, {
    type: "structured.delta",
    runId: "run_1",
    partial: { title: "ok" }
  })
  assert.equal(patch?.messages[0]?.assets?.[0]?.name, "shot.png")
  assert.deepEqual(patch?.messages[0]?.structured, { title: "ok" })
  assert.equal(patch?.messages[0]?.components?.some((item) => item.componentId === "card"), true)
})
