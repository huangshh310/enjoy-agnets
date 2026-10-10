/**
 * decideApproval → repark → 第二张卡；迟到的第一张卡不得放行；waiter 不再 push。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import type { BrowserWindow } from "electron"
import { getApproval, insertRun } from "@enjoy-agents/db"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

const {
  rememberApproval,
  assertApprovalHmac,
  sdkApprovalIdFor,
  decideApproval,
  deleteActiveRun,
  getActiveRun,
  holdAgentRun,
  waitSecondConfirmApproval,
  overrideResumeDesktopActForTest,
  getDatabase
} = await import("./repark-second-confirm.behavior.load.ts")

afterEach(() => {
  overrideResumeDesktopActForTest(null)
})

type SentEvent = { type: string; approvalId?: string }

function recordWindow(events: SentEvent[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: SentEvent) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow
}

function seedRun(runId: string): void {
  try {
    insertRun(getDatabase(), {
      id: runId,
      sessionId: `ses_${runId}`,
      workspaceId: "ws_1",
      kind: "agent",
      status: "running",
      modelId: "m",
      providerId: null,
      checkpoint: null,
      error: null
    })
  } catch {
    // 同进程库可能已有这一行。
  }
}

function holdDesktopRun(runId: string, events: SentEvent[]) {
  seedRun(runId)
  holdAgentRun({
    runId,
    window: recordWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId: `ses_${runId}`,
      workspaceId: "ws_1",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "x" }]
    }
  })
  const run = getActiveRun(runId)
  if (!run) throw new Error("holdDesktopRun failed")
  run.pumping = true
  return run
}

function sdkResponseIds(messages: unknown[]): string[] {
  const ids: string[] = []
  for (const message of messages) {
    const content = (message as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== "object") continue
      if ((part as { type?: string }).type !== "tool-approval-response") continue
      const approvalId = (part as { approvalId?: string }).approvalId
      if (approvalId) ids.push(approvalId)
    }
  }
  return ids
}

test("decideApproval → repark → 第二张卡：发给 SDK 的是原 SDK id；迟到的第一张卡不得通过", async () => {
  const runId = "run_repark_e2e"
  const events: SentEvent[] = []
  const run = holdDesktopRun(runId, events)
  const first = rememberApproval({
    approvalId: "apr_sdk_repark_e2e",
    runId,
    toolCallId: "tool_repark_e2e",
    name: "desktop_act",
    args: { observationId: "obs_1", action: "click" },
    requestArgs: { observationId: "obs_1", action: "click" }
  })
  assert.equal(first.action, "insert")
  run.pendingApprovals.push({
    approvalId: first.id,
    toolCallId: "tool_repark_e2e",
    name: "desktop_act",
    args: { observationId: "obs_1", action: "click" }
  })
  let resumes = 0
  overrideResumeDesktopActForTest(async () => {
    resumes += 1
    if (resumes === 1) {
      return {
        success: false,
        code: "needs_second_confirm",
        observationId: "obs_2",
        previousObservationId: "obs_1"
      }
    }
    return { success: true, observationId: "obs_2" }
  })
  await decideApproval(run.window, {
    runId,
    approvalId: first.id,
    toolCallId: "tool_repark_e2e",
    decision: "allow"
  })
  const second = run.pendingApprovals[0]
  assert.ok(second)
  assert.notEqual(second.approvalId, first.id)
  assert.equal(sdkApprovalIdFor(second.approvalId), "apr_sdk_repark_e2e")
  assert.equal(getApproval(getDatabase(), first.id)?.hmac, "")
  assert.throws(
    () =>
      assertApprovalHmac({
        runId,
        approvalId: first.id,
        toolCallId: "tool_repark_e2e"
      }),
    /No matching tool approval is waiting/
  )
  await assert.rejects(
    () =>
      decideApproval(run.window, {
        runId,
        approvalId: first.id,
        toolCallId: "tool_repark_e2e",
        decision: "allow"
      }),
    /No matching tool approval is waiting/
  )
  assert.equal(sdkResponseIds(run.messages).length, 0)
  await decideApproval(run.window, {
    runId,
    approvalId: second.approvalId,
    toolCallId: "tool_repark_e2e",
    decision: "allow"
  })
  assert.deepEqual(sdkResponseIds(run.messages), ["apr_sdk_repark_e2e"])
  assert.notEqual(second.approvalId, "apr_sdk_repark_e2e")
  deleteActiveRun(runId)
})

test("waitSecondConfirmApproval：第二张卡 hadWaiter 时不再 push 同一 SDK id", async () => {
  const runId = "run_wait_second_e2e"
  const events: SentEvent[] = []
  const run = holdDesktopRun(runId, events)
  const first = rememberApproval({
    approvalId: "apr_sdk_wait_e2e",
    runId,
    toolCallId: "tool_wait_e2e",
    name: "desktop_act",
    args: { observationId: "obs_w1", action: "click" },
    requestArgs: { observationId: "obs_w1", action: "click" }
  })
  run.tools.push({
    id: "tool_wait_e2e",
    name: "desktop_act",
    state: "output-available"
  } as ThreadToolCall)
  run.messages.push({
    role: "tool",
    content: [
      {
        type: "tool-approval-response",
        approvalId: "apr_sdk_wait_e2e",
        approved: true
      }
    ]
  })
  const decided = waitSecondConfirmApproval(runId, run, {
    observationId: "obs_w2",
    action: "click",
    needsSecondConfirm: true
  })
  const second = run.pendingApprovals[0]
  assert.ok(second)
  assert.notEqual(second.approvalId, first.id)
  assert.equal(sdkApprovalIdFor(second.approvalId), "apr_sdk_wait_e2e")
  const before = sdkResponseIds(run.messages)
  assert.deepEqual(before, ["apr_sdk_wait_e2e"])
  await decideApproval(run.window, {
    runId,
    approvalId: second.approvalId,
    toolCallId: "tool_wait_e2e",
    decision: "allow"
  })
  assert.equal(await decided, "allow")
  assert.deepEqual(sdkResponseIds(run.messages), ["apr_sdk_wait_e2e"])
  deleteActiveRun(runId)
})
