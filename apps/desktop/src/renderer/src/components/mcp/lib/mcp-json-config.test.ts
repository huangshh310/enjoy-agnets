/**
 * mcpServers JSON 序列化 / 解析。
 */
import test from "node:test"
import assert from "node:assert/strict"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { buildMcpConfigJson, parseMcpServersJson } from "./mcp-json-config.ts"

test("parseMcpServersJson 支持标准 mcpServers 结构", () => {
  const rawJson = JSON.stringify({
    mcpServers: {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { DEBUG: "true" }
      },
      remote_service: {
        url: "https://example.com/sse",
        transport: "sse"
      }
    }
  })

  const parsed = parseMcpServersJson(rawJson)
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0]?.name, "filesystem")
  assert.equal(parsed[0]?.transport, "stdio")
  assert.equal(parsed[0]?.command, "npx -y @modelcontextprotocol/server-filesystem /tmp")
  assert.equal(parsed[0]?.envRef, JSON.stringify({ DEBUG: "true" }))
  assert.equal(parsed[1]?.name, "remote_service")
  assert.equal(parsed[1]?.transport, "sse")
  assert.equal(parsed[1]?.url, "https://example.com/sse")
})

test("parseMcpServersJson 缺 mcpServers 键时把根对象当映射", () => {
  const parsed = parseMcpServersJson(
    JSON.stringify({
      github: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] }
    })
  )
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0]?.name, "github")
  assert.equal(parsed[0]?.command, "npx -y @modelcontextprotocol/server-github")
})

test("buildMcpConfigJson 导出 env 只留键", () => {
  const servers: McpServer[] = [
    {
      id: "1",
      name: "filesystem",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-filesystem .",
      envRef: JSON.stringify({ TOKEN: "should-not-leak" }),
      allowedResourceUris: [],
      modelVisibleTools: [],
      appOnlyTools: [],
      trusted: false,
      connected: false
    }
  ]
  const json = JSON.parse(buildMcpConfigJson(servers)) as {
    mcpServers: Record<string, { env?: Record<string, string> }>
  }
  assert.deepEqual(json.mcpServers.filesystem?.env, { TOKEN: "" })
})

test("buildMcpConfigJson 把 stdio 命令拆成 command + args", () => {
  const servers: McpServer[] = [
    {
      id: "1",
      name: "filesystem",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-filesystem .",
      allowedResourceUris: [],
      modelVisibleTools: [],
      appOnlyTools: [],
      trusted: false,
      connected: false
    }
  ]
  const json = JSON.parse(buildMcpConfigJson(servers)) as {
    mcpServers: Record<string, { command: string; args: string[] }>
  }
  assert.equal(json.mcpServers.filesystem?.command, "npx")
  assert.deepEqual(json.mcpServers.filesystem?.args, [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "."
  ])
})
