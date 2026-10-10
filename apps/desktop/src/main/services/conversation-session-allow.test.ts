/**
 * 本会话允许表：新 run 种子、敏感 desktop_act 不覆盖、工具名互通。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import { resolveToolApproval } from "@enjoy-agents/agent-core"
import {
  clearAllConversationDesktopAllows,
  snapshotConversationDesktopAllow
} from "@enjoy-agents/agent-core/computer-use"
import { deleteActiveRun, getActiveRun, holdAgentRun } from "./agent-run-state.ts"
import {
  applySessionAllowDecision,
  clearAllConversationSessionAllows,
  clearConversationSessionAllow,
  grantConversationBashPrefix,
  grantConversationToolAllow,
  seedRunSessionAllow,
  snapshotConversationSessionAllow
} from "./conversation-session-allow.ts"

const REQUIRE_ALL = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

const TERM = {
  action: "click",
  elementId: "e1",
  appKey: "com.apple.Terminal",
  appName: "终端",
  sensitive: true
}

test.beforeEach(() => {
  clearAllConversationSessionAllows()
  clearAllConversationDesktopAllows()
})

test("新 run 从会话表种子工具名与 bash 前缀", () => {
  grantConversationToolAllow("ses_seed", "write_file")
  grantConversationBashPrefix("ses_seed", "pnpm test")
  const runId = "run_seed_allow"
  holdAgentRun({
    runId,
    window: { isDestroyed: () => false, webContents: { send() {} } } as unknown as BrowserWindow,
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: "ses_seed",
      workspaceId: "ws_seed",
      modelId: "m",
      mode: "agent",
      attachments: [],
      origin: "user",
      messages: [{ role: "user", content: "write" }]
    }
  })
  const run = getActiveRun(runId)
  assert.ok(run)
  assert.equal(run.sessionApprovedTools.has("write_file"), true)
  assert.equal(run.sessionApprovedBashPrefixes.has("pnpm test"), true)
  assert.equal(
    resolveToolApproval("write_file", "agent", { ...REQUIRE_ALL, sessionApprovedTools: run.sessionApprovedTools }, {
      path: "e2e-stub.txt",
      content: "from stub"
    }),
    "approved"
  )
  // WRITE_TOOLS 互通：允许 write_file 也放行 edit_file
  assert.equal(
    resolveToolApproval("edit_file", "agent", { ...REQUIRE_ALL, sessionApprovedTools: run.sessionApprovedTools }),
    "approved"
  )
  deleteActiveRun(runId)
})

test("desktop_act 敏感不吃会话允许，也不写入工具名表", () => {
  grantConversationToolAllow("ses_term", "write_file")
  const seeded = seedRunSessionAllow("ses_term")
  assert.equal(
    resolveToolApproval("desktop_act", "agent", { ...REQUIRE_ALL, sessionApprovedTools: seeded.sessionApprovedTools }, TERM),
    "user-approval"
  )
  const run = {
    sessionApprovedTools: new Set<string>(),
    sessionApprovedBashPrefixes: new Set<string>()
  }
  applySessionAllowDecision("ses_term", run, { name: "desktop_act", args: TERM })
  assert.equal(run.sessionApprovedTools.size, 0)
  assert.equal(snapshotConversationSessionAllow("ses_term").toolNames.has("desktop_act"), false)
  assert.equal(snapshotConversationDesktopAllow("ses_term").size, 0)
})

test("二次确认 desktop_act 不写会话表", () => {
  const run = {
    sessionApprovedTools: new Set<string>(),
    sessionApprovedBashPrefixes: new Set<string>()
  }
  applySessionAllowDecision("ses_repark", run, {
    name: "desktop_act",
    args: {
      action: "click",
      appKey: "com.apple.calculator",
      needsSecondConfirm: true,
      observationId: "obs_new"
    }
  })
  assert.equal(run.sessionApprovedTools.size, 0)
  assert.equal(snapshotConversationSessionAllow("ses_repark").toolNames.size, 0)
  assert.equal(snapshotConversationDesktopAllow("ses_repark").size, 0)
})

test("allow_session 双写会话表与本轮 run 副本", () => {
  const run = {
    sessionApprovedTools: new Set<string>(),
    sessionApprovedBashPrefixes: new Set<string>()
  }
  applySessionAllowDecision("ses_write", run, { name: "write_file" })
  applySessionAllowDecision("ses_write", run, { name: "bash", args: { command: "pnpm test src/a.ts" } })
  assert.equal(run.sessionApprovedTools.has("write_file"), true)
  assert.equal(run.sessionApprovedBashPrefixes.has("pnpm test"), true)
  const snap = snapshotConversationSessionAllow("ses_write")
  assert.equal(snap.toolNames.has("write_file"), true)
  assert.equal(snap.bashPrefixes.has("pnpm test"), true)
})

test("clear 后新 run 不再带上写盘允许", () => {
  grantConversationToolAllow("ses_clear", "write_file")
  clearConversationSessionAllow("ses_clear")
  const seeded = seedRunSessionAllow("ses_clear")
  assert.equal(seeded.sessionApprovedTools.has("write_file"), false)
  assert.equal(
    resolveToolApproval("write_file", "agent", { ...REQUIRE_ALL, sessionApprovedTools: seeded.sessionApprovedTools }),
    "user-approval"
  )
})
