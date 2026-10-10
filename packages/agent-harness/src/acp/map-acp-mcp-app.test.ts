import assert from "node:assert/strict"
import { test } from "node:test"
import { MCP_APP_SRC_DOC_MAX, MCP_APP_TITLE_MAX, StreamEvent } from "@enjoy-agents/ipc-contract/stream-event"
import { mapAcpMcpApps } from "./map-acp-mcp-app.ts"

const HTML = "<!doctype html><html><body><p>hi</p></body></html>"

test("MCP App 标题截到 200，恰好 200 仍 open", () => {
  const title = "T".repeat(MCP_APP_TITLE_MAX + 20)
  const events = mapAcpMcpApps(
    {
      content: [
        {
          type: "resource",
          mimeType: "text/html",
          uri: "ui://dash",
          title,
          text: HTML
        }
      ]
    },
    "run_1"
  )
  const app = events.find((item) => item.type === "mcp.app")
  assert.equal(app?.type, "mcp.app")
  if (app?.type === "mcp.app") {
    assert.equal(app.phase, "open")
    assert.equal(app.title?.length, MCP_APP_TITLE_MAX)
  }
  assert.equal(StreamEvent.safeParse(app).success, true)
})

test("srcDoc 超过 200000 发 phase=error 与 generation.warning，不过闸丢面板", () => {
  const events = mapAcpMcpApps(
    {
      content: [
        {
          type: "resource",
          mimeType: "text/html",
          uri: "ui://huge",
          title: "Huge",
          text: `<!doctype html><html><body>${"x".repeat(MCP_APP_SRC_DOC_MAX + 1)}</body></html>`
        }
      ]
    },
    "run_1"
  )
  assert.equal(events.length, 2)
  assert.equal(events[0]?.type, "mcp.app")
  if (events[0]?.type === "mcp.app") {
    assert.equal(events[0].phase, "error")
    assert.equal(events[0].srcDoc, undefined)
  }
  assert.equal(events[1]?.type, "generation.warning")
  if (events[1]?.type === "generation.warning") {
    assert.equal(events[1].code, "mcp_app_srcdoc_too_large")
  }
  for (const event of events) {
    assert.equal(StreamEvent.safeParse(event).success, true, event.type)
  }
})
