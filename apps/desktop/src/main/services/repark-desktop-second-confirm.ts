/**
 * 重启 / 主循环 executeStoredTool 路径：needs_second_confirm 再停一张审批卡。
 * 不立刻 tool.result 给模型，也不续泵；等人确认后才对**新**观察 act。
 */
import type { BrowserWindow } from "electron"
import { rememberReparkApproval } from "./approval-hmac"
import type { PendingApproval } from "./consume-stream"
import { persistWaitingRun } from "./persist-waiting-run"
import { emitEvent, type ActiveRun } from "./agent-run-state"
import {
  APPROVAL_ARGS_MISSING,
  APPROVAL_ARGS_MISSING_MESSAGE,
  isMissingApprovalArgs
} from "./resolve-approval-args"

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
  if (isMissingApprovalArgs(input.pending.args)) {
    emitEvent(input.window, {
      type: "tool.result",
      runId: input.runId,
      toolCallId: input.pending.toolCallId,
      name: "desktop_act",
      args: input.pending.args,
      result: { code: APPROVAL_ARGS_MISSING },
      error: APPROVAL_ARGS_MISSING_MESSAGE
    })
    return
  }
  const original = asRecord(input.pending.args)
  const parked = await enrichSecondConfirmApprovalArgs(mergeSecondConfirmArgs(original, input.result))
  const approvalId = rememberReparkApproval({
    existingApprovalId: input.pending.approvalId,
    runId: input.runId,
    toolCallId: input.pending.toolCallId,
    name: "desktop_act",
    args: parked,
    requestArgs: original
  }).id
  const next: PendingApproval = {
    approvalId,
    toolCallId: input.pending.toolCallId,
    name: "desktop_act",
    args: parked
  }
  input.run.pendingApprovals.push(next)
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
