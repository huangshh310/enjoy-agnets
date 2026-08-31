import assert from "node:assert/strict"
import { test } from "node:test"
import { createSubagentApproval } from "./subagent-approval.ts"

const policy = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

test("ask 模式写盘直接拒绝", async () => {
  const decide = createSubagentApproval({ mode: "ask", policy })
  const result = await decide({ toolName: "write_file", input: { path: "a.ts", content: "x" } })
  assert.equal(typeof result === "object" && result && "type" in result && result.type, "denied")
})

test("没有等待器时 user-approval 变拒绝，不偷偷写盘", async () => {
  const decide = createSubagentApproval({ mode: "agent", policy })
  const result = await decide({ toolName: "write_file", input: { path: "a.ts", content: "x" } })
  assert.deepEqual(result, {
    type: "denied",
    reason: "subagent write needs the same parent approval."
  })
})

test("等待器 allow 后与主审批一样放行", async () => {
  const decide = createSubagentApproval({
    mode: "agent",
    policy,
    waitForApproval: async () => "allow"
  })
  assert.equal(await decide({ toolName: "write_file", toolCallId: "t1", input: {} }), "approved")
})

test("等待器 deny 后不执行", async () => {
  const decide = createSubagentApproval({
    mode: "agent",
    policy,
    waitForApproval: async () => "deny"
  })
  const result = await decide({ toolName: "bash", toolCallId: "t2", input: { command: "ls" } })
  assert.deepEqual(result, { type: "denied", reason: "user denied subagent tool." })
})

test("只读工具不打扰用户", async () => {
  const decide = createSubagentApproval({ mode: "agent", policy })
  assert.equal(await decide({ toolName: "read_file", input: { path: "a.ts" } }), "not-applicable")
})
