import assert from "node:assert/strict"
import { test } from "node:test"
import { mcpServerConfigFingerprint } from "./mcp-session-fingerprint-key.ts"

test("MCP 指纹绑 transport / command / url / envRef", () => {
  const a = mcpServerConfigFingerprint({ transport: "stdio", command: "npx demo", url: "" })
  const b = mcpServerConfigFingerprint({ transport: "stdio", command: "npx other", url: "" })
  const c = mcpServerConfigFingerprint({ transport: "http", command: "", url: "https://example" })
  const withEnv = mcpServerConfigFingerprint({
    transport: "stdio",
    command: "npx demo",
    url: "",
    envRef: "vault:demo"
  })
  assert.equal(a, "stdio\0npx demo\0\0")
  assert.equal(withEnv, "stdio\0npx demo\0\0vault:demo")
  assert.notEqual(a, b)
  assert.notEqual(a, c)
  assert.notEqual(a, withEnv)
})
