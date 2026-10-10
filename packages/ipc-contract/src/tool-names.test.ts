/**
 * 收工写类：MCP 不按叶子名，只有 readOnlyHint 才只读。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearMcpReadOnlyHints,
  isWriteTypeToolName,
  rememberMcpReadOnlyHint
} from "./tool-names.ts"

test("mcp_x__snapshot / mcp_jira__task 默认是写", () => {
  assert.equal(isWriteTypeToolName("mcp_x__snapshot"), true)
  assert.equal(isWriteTypeToolName("mcp_jira__task"), true)
  assert.equal(isWriteTypeToolName("read_file"), false)
})

test("登记 readOnlyHint 后 MCP 才只读", () => {
  rememberMcpReadOnlyHint("mcp_x__snapshot", true)
  try {
    assert.equal(isWriteTypeToolName("mcp_x__snapshot"), false)
    assert.equal(isWriteTypeToolName("mcp_jira__task"), true)
  } finally {
    clearMcpReadOnlyHints()
  }
})
