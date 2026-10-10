/**
 * 消费 Agent fullStream：映射事件、累积 transcript、处理审批。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { logAndClassifyError } from "@enjoy-agents/agent-core"
import { createId } from "./ids"
import { persistFromEvent, type RunTranscript } from "./persist-session"
import { rememberApproval } from "./approval-hmac"
import { approvalResponseMessage } from "./approval-response-message"
import { applyRememberedApproval } from "./consume-approval"
import { shouldCheckpointPersist } from "./agent-run-flush"
import { mapStreamPart, withToolId } from "./stream-parts"

export type PendingApproval = {
  approvalId: string
  toolCallId: string
  name: string
  args?: unknown
}

export async function consumeFullStream(input: {
  stream: AsyncIterable<Record<string, unknown>>
  runId: string
  window: BrowserWindow
  tools: ThreadToolCall[]
  transcript: RunTranscript
  onApproval: (pending: PendingApproval) => void
  onDecidedReplay?: (message: ModelMessage) => void
  onFirstToken?: () => void
  onUsage?: (usage: {
    inputTokens?: number
    outputTokens?: number
    noCacheTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    reasoningTokens?: number
    reportedCostUsd?: number
    maxStepInputTokens?: number
    stepInputIncomplete?: boolean
    fromTotalUsage?: boolean
  }) => void
  /** 流式过程中刷同一条助手消息，避免硬杀后只剩用户气泡。 */
  onCheckpoint?: () => void
  emit: (event: StreamEvent) => void
}) {
  let lastCheckpointAt = 0
  for await (const part of input.stream) {
    if (String(part.type ?? "") === "error") {
      throw logAndClassifyError("consume-stream", part.error ?? part)
    }
    const mapped = mapStreamPart(part, input.runId)
    if (!mapped) continue
    const event = withToolId(mapped, createId("tool"))
    if (event.type === "approval.required") {
      lastCheckpointAt = await consumeApprovalRequired(event, input, lastCheckpointAt)
      continue
    }
    persistFromEvent(input.tools, event, input.transcript)
    lastCheckpointAt = emitCheckpoint(event.type, lastCheckpointAt, input.onCheckpoint)
    if (event.type === "text.delta") input.onFirstToken?.()
    if (event.type === "step.end") {
      if (typeof event.inputTokens === "number") {
        input.onUsage?.({ maxStepInputTokens: event.inputTokens })
      } else {
        input.onUsage?.({ stepInputIncomplete: true })
      }
    }
    if (event.type === "usage.updated") {
      input.onUsage?.({
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        noCacheTokens: event.noCacheTokens,
        cacheReadTokens: event.cacheReadTokens,
        cacheWriteTokens: event.cacheWriteTokens,
        reasoningTokens: event.reasoningTokens,
        reportedCostUsd: event.reportedCostUsd,
        fromTotalUsage: true
      })
    }
    input.emit(event)
  }
}

async function consumeApprovalRequired(
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
  lastCheckpointAt: number
): Promise<number> {
  const rawArgs = event.args
  const args = await parkApprovalArgs(event.name, rawArgs)
  const toolCallId = event.toolCallId || createId("tool")
  const applied = applyRememberedApproval(
    rememberApproval({
      runId: input.runId,
      approvalId: event.approvalId || createId("apr"),
      toolCallId,
      name: event.name,
      args,
      requestArgs: rawArgs
    }),
    { toolCallId, name: event.name, args }
  )
  if (applied.kind === "open_card") {
    persistFromEvent(input.tools, event, input.transcript)
    input.onApproval(applied.pending)
    input.emit({ ...event, approvalId: applied.pending.approvalId, toolCallId, args })
    return emitCheckpoint("approval.required", lastCheckpointAt, input.onCheckpoint)
  }
  replayDecidedApproval(applied, { event, toolCallId, args, input })
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

/** 主循环待批：冻结 TTL，并补 appKey / 本观察缩略图。 */
async function parkApprovalArgs(name: string, args: unknown): Promise<unknown> {
  if (name !== "desktop_act" || !args || typeof args !== "object") return args
  const { enrichDesktopActApprovalArgs, parkDesktopActArgs } = await import(
    "./builtin-tools/computer-use/desktop-tools"
  )
  return enrichDesktopActApprovalArgs(parkDesktopActArgs(args as Record<string, unknown>))
}

function emitCheckpoint(
  eventType: string,
  lastCheckpointAt: number,
  onCheckpoint?: () => void
): number {
  if (!shouldCheckpointPersist(eventType, lastCheckpointAt, Date.now())) return lastCheckpointAt
  onCheckpoint?.()
  return Date.now()
}
