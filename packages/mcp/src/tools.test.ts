import assert from "node:assert/strict"
import { test } from "node:test"
import { isMutatingToolName, mcpAgentToolName, parseToolsList } from "./tools.ts"

test("parseToolsList 忽略无名项", () => {
  assert.deepEqual(
    parseToolsList({ tools: [{ name: "read_file", description: "Read" }, { name: "" }, 1] }),
    [{ name: "read_file", description: "Read", inputSchema: undefined }]
  )
})

test("parseToolsList 保留 inputSchema", () => {
  const schema = { type: "object", properties: { q: { type: "string" } } }
  assert.deepEqual(parseToolsList({ tools: [{ name: "search", inputSchema: schema }] }), [
    { name: "search", description: undefined, inputSchema: schema }
  ])
})

test("写类工具名视为 mutating", () => {
  assert.equal(isMutatingToolName("read_resource"), false)
  assert.equal(isMutatingToolName("write_file"), true)
  assert.equal(isMutatingToolName("delete_record"), true)
})

test("Agent 工具名用双下划线分隔", () => {
  assert.equal(mcpAgentToolName("mcp_ab", "list_dir"), "mcp_mcp_ab__list_dir")
})
