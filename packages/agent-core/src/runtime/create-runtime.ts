/**
 * 可注入的 AiRuntime：测试用内存 execute，桌面把 IPC 接到同一缓冲。
 */
import type { AiRuntime, ApprovalDecisionInput, GenerationRequest, RuntimeEvent } from "./types.ts"
import { createEventBuffer, type EventBuffer } from "./event-buffer.ts"

export type RuntimeExecute = (input: {
  runId: string
  request: GenerationRequest
  signal: AbortSignal
  emit: (event: RuntimeEvent) => void
}) => Promise<void>

export function createBufferedRuntime(options: {
  execute: RuntimeExecute
  resume?: (runId: string) => Promise<void>
  decideApproval?: (input: ApprovalDecisionInput) => Promise<void>
  createRunId?: () => string
  buffer?: EventBuffer
}): AiRuntime {
  const buffer = options.buffer ?? createEventBuffer()
  const aborts = new Map<string, AbortController>()

  return {
    async start(request) {
      const runId = options.createRunId?.() ?? `run_${Date.now()}`
      const abort = new AbortController()
      aborts.set(runId, abort)
      const emit = (event: RuntimeEvent) => buffer.push(withRunId(event, runId))
      void options
        .execute({ runId, request, signal: abort.signal, emit })
        .finally(() => aborts.delete(runId))
      return { runId }
    },
    stream(runId) {
      return buffer.stream(runId)
    },
    async abort(runId) {
      aborts.get(runId)?.abort()
    },
    async resume(runId) {
      await options.resume?.(runId)
    },
    async decideApproval(input) {
      await options.decideApproval?.(input)
    }
  }
}

function withRunId(event: RuntimeEvent, runId: string): RuntimeEvent {
  if ("runId" in event && event.runId) return event
  return { ...event, runId } as RuntimeEvent
}
