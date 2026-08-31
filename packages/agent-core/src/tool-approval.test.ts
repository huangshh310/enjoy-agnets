import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveToolApproval, toHarnessApprovalSettings } from "./tool-approval.ts"

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
})

test("三项全开：突变工具全部 user-approval", () => {
  assert.equal(resolveToolApproval("edit_file", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("write_file", "debug", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("write", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("edit", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("git_commit", "agent", REQUIRE_ALL), "user-approval")
  assert.equal(resolveToolApproval("bash", "agent", REQUIRE_ALL), "user-approval")
})

test("Edits 预设：自动写盘，仍审命令和提交", () => {
  assert.equal(resolveToolApproval("write_file", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("edit_file", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("write", "agent", EDITS), "approved")
  assert.equal(resolveToolApproval("git_commit", "agent", EDITS), "user-approval")
  assert.equal(resolveToolApproval("bash", "agent", EDITS), "user-approval")
})

test("关闭提交确认后只有 git_commit 自动批准", () => {
  const policy = { ...REQUIRE_ALL, requireCommitApproval: false }
  assert.equal(resolveToolApproval("git_commit", "agent", policy), "approved")
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

test("本会话已允许的工具直接 approved，但高风险 bash 仍暂停", () => {
  const policy = { ...REQUIRE_ALL, sessionApprovedTools: new Set(["bash"]) }
  assert.equal(
    resolveToolApproval("bash", "agent", policy, { command: "pnpm test" }),
    "approved"
  )
  assert.equal(
    resolveToolApproval("bash", "agent", policy, { command: "rm -rf dist" }),
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
  assert.equal(reads.toolApproval.write_file, "user-approval")
  assert.equal(reads.toolApproval.write, "user-approval")
  assert.equal(reads.toolApproval.edit, "user-approval")

  const edits = toHarnessApprovalSettings("agent", EDITS)
  assert.equal(edits.permissionMode, "allow-edits")
  assert.equal(edits.toolApproval.edit_file, "approved")
  assert.equal(edits.toolApproval.write, "approved")
  assert.equal(edits.toolApproval.bash, "user-approval")

  const all = toHarnessApprovalSettings("debug", AUTO_ALL)
  assert.equal(all.permissionMode, "allow-edits")
  assert.equal(all.toolApproval.bash, "approved")
  assert.equal(all.toolApproval.write, "approved")
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

test("MCP 写工具要审批，读工具直接过", () => {
  assert.equal(resolveToolApproval("mcp_s1__read_file", "agent", REQUIRE_ALL), "not-applicable")
  assert.equal(resolveToolApproval("mcp_s1__write_file", "agent", REQUIRE_ALL), "user-approval")
  assert.deepEqual(resolveToolApproval("mcp_s1__write_file", "ask", REQUIRE_ALL), {
    type: "denied",
    reason: "ask mode is read-only."
  })
})

test("Harness 映射会带上会话已放行的工具", () => {
  const settings = toHarnessApprovalSettings("agent", {
    ...REQUIRE_ALL,
    sessionApprovedTools: new Set(["write_file"])
  })
  assert.equal(settings.toolApproval.write_file, "approved")
  assert.equal(settings.toolApproval.write, "approved")
  assert.equal(settings.toolApproval.bash, "user-approval")
})
