import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  DESKTOP_ACT_BARE_COORDS_DISABLED_REASON
} from "../computer-use/desktop-act-honesty.ts"
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

test("bash 的 allow_session 只白名单命令前缀", async () => {
  let asked = 0
  const decide = createSubagentApproval({
    mode: "agent",
    policy,
    waitForApproval: async () => {
      asked += 1
      return "allow_session"
    }
  })
  assert.equal(await decide({ toolName: "bash", input: { command: "git status" } }), "approved")
  assert.equal(await decide({ toolName: "bash", input: { command: "git status --short" } }), "approved")
  assert.equal(asked, 1)
  assert.equal(await decide({ toolName: "bash", input: { command: "pnpm test" } }), "approved")
  assert.equal(asked, 2)
})

test("只读工具不打扰用户", async () => {
  const decide = createSubagentApproval({ mode: "agent", policy })
  assert.equal(await decide({ toolName: "read_file", input: { path: "a.ts" } }), "not-applicable")
})

test("子 Agent 共用 policy.desktopAdvancedCoords：默认 OFF 硬拒带坐标的 elementId", async () => {
  const decide = createSubagentApproval({ mode: "agent", policy })
  const result = await decide({
    toolName: "desktop_act",
    input: { action: "click", elementId: "0.1", x: 12, y: 34 }
  })
  assert.deepEqual(result, {
    type: "denied",
    reason: DESKTOP_ACT_BARE_COORDS_DISABLED_REASON,
    code: DESKTOP_ACT_BARE_COORDS_DISABLED
  })
})

test("子 Agent 打开高级坐标时带坐标的 elementId 仍要父审批，不静默执行", async () => {
  const decide = createSubagentApproval({
    mode: "agent",
    policy: { ...policy, desktopAdvancedCoords: true }
  })
  const result = await decide({
    toolName: "desktop_act",
    input: { action: "drag", elementId: "0.1", x2: 80, y2: 90 }
  })
  assert.deepEqual(result, {
    type: "denied",
    reason: "subagent write needs the same parent approval."
  })
})
