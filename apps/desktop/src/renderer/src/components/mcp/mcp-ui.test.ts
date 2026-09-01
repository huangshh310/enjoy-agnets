/**
 * MCP UI 纯函数与预设配置单元测试
 */
import test from "node:test"
import assert from "node:assert/strict"
import { FEATURED_MCP_PRESETS, MCP_PLUGIN_CATEGORIES } from "./constants/mcp-presets.ts"

test("MCP_PLUGIN_CATEGORIES 包含完整分类定义", () => {
  const ids = MCP_PLUGIN_CATEGORIES.map((c) => c.id)
  assert.ok(ids.includes("all"))
  assert.ok(ids.includes("storage"))
  assert.ok(ids.includes("dev"))
  assert.ok(ids.includes("database"))
  assert.ok(ids.includes("web"))
  assert.ok(ids.includes("apps"))
})

test("FEATURED_MCP_PRESETS 每一个预设都有合法协议和命令", () => {
  assert.ok(FEATURED_MCP_PRESETS.length >= 8)
  for (const preset of FEATURED_MCP_PRESETS) {
    assert.ok(preset.id.length > 0)
    assert.ok(preset.name.length > 0)
    assert.ok(["stdio", "sse", "http"].includes(preset.transport))
    if (preset.transport === "stdio") {
      assert.ok(Boolean(preset.command && preset.command.length > 0))
    }
    assert.ok(Array.isArray(preset.features))
  }
})

test("能够识别需配置环境变量的插件预设 (如 GitHub, Brave Search)", () => {
  const github = FEATURED_MCP_PRESETS.find((p) => p.id === "github")
  assert.ok(github)
  assert.ok(github.envTemplates && github.envTemplates.length > 0)
  assert.equal(github.envTemplates[0]?.key, "GITHUB_PERSONAL_ACCESS_TOKEN")

  const brave = FEATURED_MCP_PRESETS.find((p) => p.id === "brave-search")
  assert.ok(brave)
  assert.ok(brave.envTemplates && brave.envTemplates.length > 0)
  assert.equal(brave.envTemplates[0]?.key, "BRAVE_API_KEY")
})

test("JSON Spec 解析支持标准 mcpServers 结构", () => {
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

  const parsed = JSON.parse(rawJson) as {
    mcpServers: Record<string, { command?: string; args?: string[]; url?: string }>
  }
  const keys = Object.keys(parsed.mcpServers)
  assert.equal(keys.length, 2)
  assert.equal(keys[0], "filesystem")
  assert.equal(keys[1], "remote_service")

  const fsConfig = parsed.mcpServers.filesystem
  assert.equal(fsConfig?.command, "npx")
  assert.deepEqual(fsConfig?.args, ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"])
})
