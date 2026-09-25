/**
 * 重启 / 主循环 executeStoredTool 路径：needs_second_confirm 再停一张审批卡。
 * 不立刻 tool.result 给模型，也不续泵；等人确认后才对**新**观察 act。
 */
import type { BrowserWindow } from "electron"
import { rememberApproval } from "./approval-hmac"
import type { PendingApproval } from "./consume-stream"
import { createId } from "./ids"
import { persistWaitingRun } from "./persist-waiting-run"
import { emitEvent, type ActiveRun } from "./agent-run-state"

export async function reparkDesktopSecondConfirm(input: {
  run: ActiveRun
  runId: string
  window: BrowserWindow
  pending: PendingApproval
  result: Record<string, unknown>
}): Promise<void> {
  const { enrichSecondConfirmApprovalArgs, mergeSecondConfirmArgs } = await import(
    "./builtin-tools/computer-use/desktop-second-confirm-park"
  )
  const original = asRecord(input.pending.args)
  const parked = await enrichSecondConfirmApprovalArgs(mergeSecondConfirmArgs(original, input.result))
  const approvalId = createId("apr")
  const next: PendingApproval = {
    approvalId,
    toolCallId: input.pending.toolCallId,
    name: "desktop_act",
    args: parked
  }
  input.run.pendingApprovals.push(next)
  rememberApproval({
    runId: input.runId,
    approvalId,
    toolCallId: next.toolCallId,
    name: next.name,
    args: parked
  })
  persistWaitingRun(input.run, input.runId)
  emitEvent(input.window, {
    type: "approval.required",
    runId: input.runId,
    approvalId,
    toolCallId: next.toolCallId,
    name: next.name,
    args: parked
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
