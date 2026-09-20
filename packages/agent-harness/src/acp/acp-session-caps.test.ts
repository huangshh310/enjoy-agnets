import assert from "node:assert/strict"
import { test } from "node:test"
import { parseAcpSessionCaps } from "./acp-session-caps.ts"

test("v2 session {} 打开 list/resume/close，delete 要单独广告", () => {
  const caps = parseAcpSessionCaps({
    protocolVersion: 2,
    capabilities: { session: {} }
  })
  assert.equal(caps.list, true)
  assert.equal(caps.resume, true)
  assert.equal(caps.close, true)
  assert.equal(caps.delete, false)
})

test("session.delete {} 才打开删除", () => {
  const caps = parseAcpSessionCaps({
    protocolVersion: 2,
    capabilities: { session: { delete: {} } }
  })
  assert.equal(caps.delete, true)
})

test("缺 session 能力则全关；旧 mcpCapabilities 仍认", () => {
  const caps = parseAcpSessionCaps({
    protocolVersion: 1,
    agentCapabilities: { mcpCapabilities: { http: true } }
  })
  assert.equal(caps.list, false)
  assert.equal(caps.resume, false)
  assert.deepEqual(caps.mcp, { http: true, sse: false })
})

test("v2 session.mcp.http {} 也算广告", () => {
  const caps = parseAcpSessionCaps({
    protocolVersion: 2,
    capabilities: { session: { mcp: { http: {} } } }
  })
  assert.equal(caps.mcp.http, true)
})
