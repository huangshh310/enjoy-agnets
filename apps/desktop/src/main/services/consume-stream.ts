/**
 * 消费 Agent fullStream：映射事件、累积 transcript、处理审批。
 */
import type { BrowserWindow } from "electron"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { createId } from "./ids"
import { persistFromEvent, type RunTranscript } from "./persist-session"
import { rememberApproval } from "./approval-hmac"
import { classifyError } from "@enjoy-agents/agent-core"
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
  emit: (event: StreamEvent) => void
}) {
  for await (const part of input.stream) {
    if (String(part.type ?? "") === "error") {
      throw classifyError(part.error ?? part)
    }
    const mapped = mapStreamPart(part, input.runId)
    if (!mapped) continue
    const event = withToolId(mapped, createId("tool"))
    persistFromEvent(input.tools, event, input.transcript)
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
