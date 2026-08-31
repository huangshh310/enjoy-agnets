import assert from "node:assert/strict"
import { test } from "node:test"
import { approvedDemoAppHtml, sanitizeAppMessage, uriFrom, wrapApprovedAppHtml } from "./app-host.ts"

test("拒绝非白名单方法和未授权 URI", () => {
  assert.deepEqual(sanitizeAppMessage({ jsonrpc: "2.0", method: "fs/write" }, []), {
    error: "method-not-allowed"
  })
  assert.deepEqual(
    sanitizeAppMessage(
      { jsonrpc: "2.0", method: "resources/read", params: { uri: "file:///etc/passwd" } },
      ["mcp://docs"]
    ),
    { error: "uri-not-allowed" }
  )
})

test("允许白名单资源读取", () => {
  const result = sanitizeAppMessage(
    { jsonrpc: "2.0", method: "resources/read", params: { uri: "mcp://docs" } },
    ["mcp://docs"]
  )
  assert.equal("method" in result && result.method, "resources/read")
})

test("uriFrom 只接受字符串 uri", () => {
  assert.equal(uriFrom({ uri: "mcp://docs" }), "mcp://docs")
  assert.equal(uriFrom({ uri: 1 }), undefined)
})

test("已批准 App HTML 带 CSP 且不含 Node", () => {
  const html = wrapApprovedAppHtml("<p>hi</p>")
  assert.ok(html.includes("Content-Security-Policy"))
  assert.ok(html.includes("connect-src 'none'"))
  assert.ok(html.includes("script-src 'unsafe-inline'"))
  assert.equal(html.includes("require("), false)
  assert.ok(approvedDemoAppHtml().includes("app-log-ok"))
})
