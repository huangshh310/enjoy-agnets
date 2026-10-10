/**
 * 流上的 approval.required：回填或缺参 fail-closed，禁止用 {} 弹允许卡。
 */
import type { ModelMessage } from "ai"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { createId } from "./ids"
import { persistFromEvent, type RunTranscript } from "./persist-session"
import {
  rememberApproval,
  recordApprovalDecision,
  recordSdkApprovalResponse
} from "./approval-hmac"
import { approvalResponseMessage } from "./approval-response-message"
import { applyRememberedApproval } from "./consume-approval"
import {
  APPROVAL_ARGS_MISSING,
  isMissingApprovalArgs,
  resolveApprovalArgs
} from "./resolve-approval-args"
import type { PendingApproval } from "./consume-stream"

export async function consumeApprovalRequired(
  event: StreamEvent & { type: "approval.required" },
  input: {
    runId: string
    tools: ThreadToolCall[]
    transcript: RunTranscript
    onApproval: (pending: PendingApproval) => void
    onDecidedReplay?: (message: ModelMessage) => void
    onCheckpoint?: () => void
    emit: (event: StreamEvent) => void
  },
  lastCheckpointAt: number,
  emitCheckpoint: (eventType: string, last: number, onCheckpoint?: () => void) => number
): Promise<number> {
  const toolCallId = event.toolCallId || createId("tool")
  const requestArgs = event.args
  const resolved = resolveApprovalArgs({
    name: event.name,
    args: requestArgs,
    toolCallId,
    tools: input.tools
  })
  if (!resolved.ok) {
    return denyMissingArgs(event, input, toolCallId, requestArgs, resolved, lastCheckpointAt, emitCheckpoint)
  }
  const args = await parkApprovalArgs(event.name, resolved.args)
  const applied = applyRememberedApproval(
    rememberApproval({
      runId: input.runId,
      approvalId: event.approvalId || createId("apr"),
      toolCallId,
      name: event.name,
      args,
      requestArgs
    }),
    { toolCallId, name: event.name, args }
  )
  if (applied.kind === "open_card") {
    persistFromEvent(input.tools, { ...event, args }, input.transcript)
    input.onApproval(applied.pending)
    input.emit({ ...event, approvalId: applied.pending.approvalId, toolCallId, args })
    return emitCheckpoint("approval.required", lastCheckpointAt, input.onCheckpoint)
  }
  replayDecidedApproval(applied, { event, toolCallId, args, input })
  return emitCheckpoint("tool.result", lastCheckpointAt, input.onCheckpoint)
}

function denyMissingArgs(
  event: StreamEvent & { type: "approval.required" },
  input: {
    runId: string
    tools: ThreadToolCall[]
    transcript: RunTranscript
    onDecidedReplay?: (message: ModelMessage) => void
    onCheckpoint?: () => void
    emit: (event: StreamEvent) => void
  },
  toolCallId: string,
  requestArgs: unknown,
  resolved: { code: string; message: string },
  lastCheckpointAt: number,
  emitCheckpoint: (eventType: string, last: number, onCheckpoint?: () => void) => number
): number {
  const approvalId = event.approvalId || createId("apr")
  const plan = rememberApproval({
    runId: input.runId,
    approvalId,
    toolCallId,
    name: event.name,
    args: requestArgs,
    requestArgs
  })
  recordApprovalDecision(plan.id, "deny")
  recordSdkApprovalResponse(plan.id, {
    approved: false,
    reason: resolved.message,
    resumeCode: APPROVAL_ARGS_MISSING
  })
  input.onDecidedReplay?.(
    approvalResponseMessage({
      approvalId: plan.sdkApprovalId ?? approvalId,
      approved: false,
      reason: resolved.message
    })
  )
  const follow: StreamEvent = {
    type: "tool.result",
    runId: input.runId,
    toolCallId,
    name: event.name,
    args: requestArgs,
    result: { code: resolved.code },
    error: resolved.message
  }
  persistFromEvent(input.tools, follow, input.transcript)
  input.emit(follow)
  return emitCheckpoint("tool.result", lastCheckpointAt, input.onCheckpoint)
}

function replayDecidedApproval(
  applied: Exclude<ReturnType<typeof applyRememberedApproval>, { kind: "open_card" }>,
  ctx: {
    event: StreamEvent & { type: "approval.required" }
    toolCallId: string
    args: unknown
    input: {
      runId: string
      tools: ThreadToolCall[]
      transcript: RunTranscript
      onDecidedReplay?: (message: ModelMessage) => void
      emit: (event: StreamEvent) => void
    }
  }
) {
  const approved = applied.kind === "replay" ? applied.approved : false
  const reason = applied.kind === "fail_closed" ? applied.code : applied.reason
  ctx.input.onDecidedReplay?.(
    approvalResponseMessage({ approvalId: applied.approvalId, approved, reason })
  )
  const follow: StreamEvent =
    applied.kind === "replay"
      ? {
          type: "approval.resolved",
          runId: ctx.input.runId,
          toolCallId: ctx.toolCallId,
          decision: applied.decision
        }
      : {
          type: "tool.result",
          runId: ctx.input.runId,
          toolCallId: ctx.toolCallId,
          name: ctx.event.name,
          args: ctx.args,
          result: { code: applied.code },
          error: applied.message
        }
  persistFromEvent(ctx.input.tools, follow, ctx.input.transcript)
  ctx.input.emit(follow)
}

/** desktop_act 空参不得拿去判敏感 / 二次确认。 */
export async function parkApprovalArgs(name: string, args: unknown): Promise<unknown> {
  if (name !== "desktop_act" || isMissingApprovalArgs(args) || typeof args !== "object") {
    return args
  }
  const { enrichDesktopActApprovalArgs, parkDesktopActArgs } = await import(
    "./builtin-tools/computer-use/desktop-tools"
  )
  return enrichDesktopActApprovalArgs(parkDesktopActArgs(args as Record<string, unknown>))
}
