/**
 * 消费 Agent fullStream：映射事件、累积 transcript、处理审批。
 */
import type { BrowserWindow } from "electron"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { createId } from "./ids"
import { persistFromEvent, type RunTranscript } from "./persist-session"
import { rememberApproval } from "./approval-hmac"
import { classifyError } from "@enjoy-agents/agent-core"
import { shouldCheckpointPersist } from "./agent-run-flush"
import { mapStreamPart, withToolId } from "./stream-parts"

export type PendingApproval = {
  approvalId: string
  toolCallId: string
  name: string
}

export async function consumeFullStream(input: {
  stream: AsyncIterable<Record<string, unknown>>
  runId: string
  window: BrowserWindow
  tools: ThreadToolCall[]
  transcript: RunTranscript
  onApproval: (pending: PendingApproval) => void
  onFirstToken?: () => void
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number }) => void
  /** 流式过程中刷同一条助手消息，避免硬杀后只剩用户气泡。 */
  onCheckpoint?: () => void
  emit: (event: StreamEvent) => void
}) {
  let lastCheckpointAt = 0
  for await (const part of input.stream) {
    if (String(part.type ?? "") === "error") {
      throw classifyError(part.error ?? part)
    }
    const mapped = mapStreamPart(part, input.runId)
    if (!mapped) continue
    const event = withToolId(mapped, createId("tool"))
    persistFromEvent(input.tools, event, input.transcript)
    lastCheckpointAt = emitCheckpoint(event.type, lastCheckpointAt, input.onCheckpoint)
    if (event.type === "text.delta") input.onFirstToken?.()
    if (event.type === "usage.updated") {
      input.onUsage?.({ inputTokens: event.inputTokens, outputTokens: event.outputTokens })
    }
    if (event.type === "approval.required") {
      const pending: PendingApproval = {
        approvalId: event.approvalId || createId("apr"),
        toolCallId: event.toolCallId || createId("tool"),
        name: event.name
      }
      rememberApproval({
        runId: input.runId,
        approvalId: pending.approvalId,
        toolCallId: pending.toolCallId,
        name: pending.name,
        args: event.args
      })
      input.onApproval(pending)
      input.emit({ ...event, approvalId: pending.approvalId, toolCallId: pending.toolCallId })
      continue
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
