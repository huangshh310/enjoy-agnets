import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isExploreMutatingDeny,
  isMcpWriteToolName,
  resolveToolApproval,
  toHarnessApprovalSettings
} from "./tool-approval.ts"

const REQUIRE_ALL = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}
const AUTO_ALL = {
  requireWriteApproval: false,
  requireBashApproval: false,
  requireCommitApproval: false
}
const EDITS = {
  requireWriteApproval: false,
  requireBashApproval: true,
  requireCommitApproval: true
}

test("只读工具不走审批", () => {
  assert.equal(resolveToolApproval("read_file", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("grep", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("git_status", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("git_log", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("git_log", "plan", REQUIRE_ALL), "not-applicable")
})

test("ask_user_questions 在 plan/ask 也要停车，不因只读被拒", () => {
  assert.equal(resolveToolApproval("ask_user_questions", "plan", AUTO_ALL), "user-approval")
  assert.equal(resolveToolApproval("ask_user_questions", "ask", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("ask_user_questions", "agent", AUTO_ALL), "user-approval")
  assert.equal(resolveToolApproval("set_session_heartbeat", "plan", AUTO_ALL), "user-approval")
})

test("探索态宿主拦截含 ACP 弱名 command", () => {
  assert.equal(isExploreMutatingDeny("plan", "write_file"), true)
  assert.equal(isExploreMutatingDeny("ask", "command"), true)
  assert.equal(isExploreMutatingDeny("plan", "bash"), true)
  assert.equal(isExploreMutatingDeny("plan", "str_replace"), true)
  assert.equal(isExploreMutatingDeny("plan", "read_file"), false)
  assert.equal(isExploreMutatingDeny("agent", "write_file"), false)
})

test("Ask 模式下写盘、命令、提交一律拒绝", () => {
  assert.deepEqual(resolveToolApproval("write_file", "ask", AUTO_ALL), {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.deepEqual(resolveToolApproval("bash", "plan", REQUIRE_ALL), {
    type: "denied",
    reason: "plan mode is read-only."
  })
  assert.deepEqual(resolveToolApproval("git_commit", "ask", EDITS), {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.deepEqual(resolveToolApproval("write", "ask", AUTO_ALL), {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.deepEqual(resolveToolApproval("code_mode", "ask", AUTO_ALL), {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.deepEqual(resolveToolApproval("desktop_act", "plan", EDITS), {
    type: "denied",
    reason: "plan mode is read-only."
  })
})

test("desktop_act：wait 不审，会话放行绑 appKey，裸工具名不放行", () => {
  const naked = { ...EDITS, sessionApprovedTools: new Set(["desktop_act"]) }
  const calc = {
    ...EDITS,
    sessionApprovedTools: new Set(["desktop_act:com.apple.calculator"])
  }
  assert.equal(resolveToolApproval("desktop_act", "agent", EDITS, { action: "wait", observationId: "obs" }), "not-applicable")
  assert.equal(
    resolveToolApproval("desktop_act", "agent", naked, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator"
    }),
    "user-approval"
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", calc, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.calculator"
    }),
    "approved"
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", calc, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.notes"
    }),
    "user-approval"
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", calc, { action: "click", x: 1, appKey: "com.apple.calculator" }),
    "user-approval"
  )
  assert.equal(
    resolveToolApproval("desktop_act", "agent", calc, {
      action: "click",
      elementId: "e1",
      allowForeground: true,
      appKey: "com.apple.calculator"
    }),
    "user-approval"
  )
})

test("desktop_act：desktop_act:* 与任意桌面开关等价，仍拦坐标和敏感窗", () => {
  const starred = { ...EDITS, sessionApprovedTools: new Set(["desktop_act:*"]) }
  assert.equal(
    resolveToolApproval("desktop_act", "agent", starred, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.notes"
    }),
    "approved"
  )
  assert.equal(resolveToolApproval("desktop_act", "agent", starred, { action: "click", x: 1 }), "user-approval")
})

test("desktop_act：任意桌面开关放行元素点击，仍拦坐标和敏感窗", () => {
  const any = { ...EDITS, anyDesktopSession: true }
  assert.equal(
    resolveToolApproval("desktop_act", "agent", any, {
      action: "click",
      elementId: "e1",
      appKey: "com.apple.notes"
    }),
    "approved"
  )
  assert.equal(resolveToolApproval("desktop_act", "agent", any, { action: "click", x: 1 }), "user-approval")
  assert.equal(
    resolveToolApproval("desktop_act", "agent", any, {
      action: "click",
      elementId: "e1",
      appName: "系统设置"
    }),
    "user-approval"
  )
})

test("三项全开：突变工具全部 user-approval", () => {
  assert.equal(resolveToolApproval("edit_file", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("write_file", "debug", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("write", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("edit", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("git_commit", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("git_push", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("bash", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("code_mode", "agent", REQUIRE_ALL), "user-approval")
})

test("Edits 预设：自动写盘，仍审命令和提交", () => {
  assert.equal(resolveToolApproval("write_file", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("edit_file", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("write", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("git_commit", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("git_push", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("bash", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("code_mode", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("browser_navigate", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("code_mode", "agent", AUTO_ALL), "approved")
})

test("关闭提交确认后 git_commit / git_push 自动批准", () => {
  const policy = { ...REQUIRE_ALL, requireCommitApproval: false }
  assert.equal(resolveToolApproval("git_commit", "agent", policy), "approved")
  assert.equal(resolveToolApproval("git_push", "agent", policy), "approved")
  assert.equal(resolveToolApproval("write_file", "agent", policy), "user-approval")
})

test("Auto 下普通 bash 放行，高风险命令仍暂停", () => {
  assert.equal(
    resolveToolApproval("bash", "agent", AUTO_ALL, { command: "pnpm test" }),
    "approved"
  )
  assert.equal(
    resolveToolApproval("bash", "agent", AUTO_ALL, { command: "rm -rf dist" }),
    "user-approval"
  )
})

test("本会话 bash 只放行命令前缀，不是整个 bash 工具", () => {
  const policy = { ...REQUIRE_ALL, sessionApprovedBashPrefixes: ["pnpm test"] }
  assert.equal(
    resolveToolApproval("bash", "agent", policy, { command: "pnpm test src/a.ts" }),
    "approved"
  )
  assert.equal(
    resolveToolApproval("bash", "agent", policy, { command: "git push" }),
    "user-approval"
  )
  assert.equal(
    resolveToolApproval("bash", "agent", { ...REQUIRE_ALL, sessionApprovedTools: new Set(["bash"]) }, {
      command: "pnpm test"
    }),
    "user-approval"
  )
  assert.equal(resolveToolApproval("write_file", "agent", policy), "user-approval")
})

test("会话放行 write 时，write_file / edit 一并放行", () => {
  const policy = { ...REQUIRE_ALL, sessionApprovedTools: new Set(["write"]) }
  assert.equal(resolveToolApproval("write", "agent", policy), "approved")
  assert.equal(resolveToolApproval("write_file", "agent", policy), "approved")
  assert.equal(resolveToolApproval("edit_file", "agent", policy), "approved")
})

test("Ask 模式即使会话已放行也拒绝", () => {
  const policy = { ...AUTO_ALL, sessionApprovedTools: new Set(["write_file", "bash"]) }
  assert.deepEqual(resolveToolApproval("write_file", "ask", policy), {
    type: "denied",
    reason: "ask mode is read-only."
  })
})

test("Harness settings：allow-reads / allow-edits；All 降为 allow-edits", () => {
  const reads = toHarnessApprovalSettings("agent", REQUIRE_ALL)
  assert.equal(reads.permissionMode, "allow-reads")
  assert.equal(reads.toolApproval.read_file, "not-applicable")
  assert.equal(reads.toolApproval.git_log, "not-applicable")
  assert.equal(reads.toolApproval.write_file, "user-approval")
  assert.equal(reads.toolApproval.write, "user-approval")
  assert.equal(reads.toolApproval.edit, "user-approval")

  const edits = toHarnessApprovalSettings("agent", EDITS)
  assert.equal(edits.permissionMode, "allow-edits")
  assert.equal(edits.toolApproval.edit_file, "approved")
  assert.equal(edits.toolApproval.write, "approved")
  assert.equal(edits.toolApproval.bash, "user-approval")
  assert.equal(edits.toolApproval.code_mode, "user-approval")
  assert.equal(edits.toolApproval.browser_navigate, "user-approval")

  const all = toHarnessApprovalSettings("debug", AUTO_ALL)
  assert.equal(all.permissionMode, "allow-edits")
  assert.equal(all.toolApproval.bash, "approved")
  assert.equal(all.toolApproval.write, "approved")
  assert.equal(all.toolApproval.code_mode, "approved")
})

test("Ask 模式写入 Harness host toolApproval 为 denied", () => {
  const settings = toHarnessApprovalSettings("ask", AUTO_ALL)
  assert.deepEqual(settings.toolApproval.write_file, {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.deepEqual(settings.toolApproval.write, {
    type: "denied",
    reason: "ask mode is read-only."
  })
})

test("MCP 写名按 leaf 判断，与注册过滤同一规则", () => {
  assert.equal(isMcpWriteToolName("mcp_s1__read_file"), false)
  assert.equal(isMcpWriteToolName("mcp_s1__write_file"), true)
  assert.equal(isMcpWriteToolName("mcp_s1__delete_record"), true)
})

test("MCP 写工具要审批，读工具直接过", () => {
  assert.equal(resolveToolApproval("mcp_s1__read_file", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("mcp_s1__write_file", "agent", REQUIRE_ALL), "user-approval")
  assert.deepEqual(resolveToolApproval("mcp_s1__write_file", "ask", REQUIRE_ALL), {
    type: "denied",
    reason: "ask mode is read-only."
  })
  assert.equal(resolveToolApproval("mcp_s1__read_file", "plan", REQUIRE_ALL), "not-applicable")
})

test("Harness 静态表不登记 ask_user_questions", () => {
  const settings = toHarnessApprovalSettings("agent", REQUIRE_ALL)
  assert.equal(settings.toolApproval.ask_user_questions, undefined)
})

test("Harness 映射会带上会话已放行的工具", () => {
  const settings = toHarnessApprovalSettings("agent", {
    ...REQUIRE_ALL,
    sessionApprovedTools: new Set(["write_file"])
  })
  assert.equal(settings.toolApproval.write_file, "approved")
  assert.equal(settings.toolApproval.write, "approved")
  assert.equal(settings.toolApproval.bash, "user-approval")
  assert.equal(settings.toolApproval.code_mode, "user-approval")
})
