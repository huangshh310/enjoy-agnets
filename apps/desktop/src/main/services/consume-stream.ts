/**
 * 消费 Agent fullStream：映射事件、累积 transcript、处理审批。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { logAndClassifyError } from "@enjoy-agents/agent-core"
import { createId } from "./ids"
import { persistFromEvent, type RunTranscript } from "./persist-session"
import { consumeApprovalRequired } from "./consume-approval-required"
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
      lastCheckpointAt = await consumeApprovalRequired(event, input, lastCheckpointAt, emitCheckpoint)
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

function emitCheckpoint(
  eventType: string,
  lastCheckpointAt: number,
  onCheckpoint?: () => void
): number {
  if (!shouldCheckpointPersist(eventType, lastCheckpointAt, Date.now())) return lastCheckpointAt
  onCheckpoint?.()
  return Date.now()
}
