import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isCuratedMcpServerName,
  isMutatingToolName,
  mcpAgentToolName,
  mcpReadOnlyHintApplies,
  mcpToolRequiresWriteApproval,
  parseToolsList
} from "./tools.ts"

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

test("parseToolsList 只在 annotations.readOnlyHint 为 true 时记下", () => {
  assert.deepEqual(
    parseToolsList({
      tools: [
        { name: "snapshot", annotations: { readOnlyHint: true } },
        { name: "task", annotations: { readOnlyHint: false } }
      ]
    }),
    [
      { name: "snapshot", description: undefined, inputSchema: undefined, readOnlyHint: true },
      { name: "task", description: undefined, inputSchema: undefined }
    ]
  )
})

test("写类工具名视为 mutating", () => {
  assert.equal(isMutatingToolName("read_resource"), false)
  assert.equal(isMutatingToolName("write_file"), true)
  assert.equal(isMutatingToolName("delete_record"), true)
  assert.equal(isMutatingToolName("bash"), true)
  assert.equal(isMutatingToolName("run_command"), true)
  assert.equal(isMutatingToolName("list_commands"), false)
})

test("Agent 工具名用双下划线分隔", () => {
  assert.equal(mcpAgentToolName("mcp_ab", "list_dir"), "mcp_mcp_ab__list_dir")
})

test("readOnlyHint 只对精选 / 已信任服务器生效", () => {
  assert.equal(isCuratedMcpServerName("filesystem"), true)
  assert.equal(isCuratedMcpServerName("evil-server"), false)
  assert.equal(mcpReadOnlyHintApplies({ hint: true, trusted: false, curated: false }), false)
  assert.equal(mcpReadOnlyHintApplies({ hint: true, trusted: true }), true)
  assert.equal(mcpReadOnlyHintApplies({ hint: true, curated: true }), true)
  assert.equal(mcpReadOnlyHintApplies({ hint: false, trusted: true }), false)
  assert.equal(mcpToolRequiresWriteApproval({ readOnlyHint: true, trusted: false }), true)
  assert.equal(mcpToolRequiresWriteApproval({ readOnlyHint: true, curated: true }), false)
  assert.equal(mcpToolRequiresWriteApproval({ readOnlyHint: true, trusted: true }), false)
})
