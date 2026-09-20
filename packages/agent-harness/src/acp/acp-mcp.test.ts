import assert from "node:assert/strict"
import { test } from "node:test"
import { acpMcpFingerprint, filterAcpMcpServers, parseAgentMcpCaps, type AcpMcpServer } from "./acp-mcp.ts"

const stdio: AcpMcpServer = { name: "fs", command: "/usr/bin/npx", args: ["-y", "x"] }
const http: AcpMcpServer = { type: "http", name: "api", url: "https://example.com/mcp" }
const sse: AcpMcpServer = { type: "sse", name: "events", url: "https://example.com/sse" }

test("filterAcpMcpServers 未广告 http/sse 时丢掉 URL 项，保留 stdio", () => {
  assert.deepEqual(filterAcpMcpServers([stdio, http, sse], { http: false, sse: false }), [stdio])
  assert.deepEqual(filterAcpMcpServers([stdio, http, sse], { http: true, sse: false }), [stdio, http])
  assert.deepEqual(filterAcpMcpServers([stdio, http, sse], { http: true, sse: true }), [stdio, http, sse])
})

test("acpMcpFingerprint 随列表变化", () => {
  assert.notEqual(acpMcpFingerprint([]), acpMcpFingerprint([stdio]))
})

test("parseAgentMcpCaps 只信握手广告", () => {
  assert.deepEqual(parseAgentMcpCaps({ agentCapabilities: { mcpCapabilities: { http: true } } }), {
    http: true,
    sse: false
  })
  assert.deepEqual(parseAgentMcpCaps({ capabilities: { session: { mcp: { http: {} } } } }), {
    http: true,
    sse: false
  })
  assert.deepEqual(parseAgentMcpCaps({}), { http: false, sse: false })
})
