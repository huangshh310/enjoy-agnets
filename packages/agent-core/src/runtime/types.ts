/**
 * 统一 AI Runtime 接口与适配器。测试注入内存实现。
 */
import type { GenerationKind, StreamEvent } from "@enjoy-agents/ipc-contract"

export type RuntimeEvent = StreamEvent

export type GenerationRequest = {
  kind: GenerationKind
  sessionId: string
  workspaceId?: string
  providerId?: string
  modelId: string
  prompt?: string
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string; reasoning?: string }>
  schemaJson?: unknown
  attachments?: string[]
  timeoutMs?: number
  telemetryPolicy?: "local" | "otel" | "off"
  runtimeContext?: Record<string, unknown>
  experimental?: boolean
}

export type ApprovalDecisionInput = {
  runId: string
  toolCallId: string
  approvalId: string
  decision: "allow" | "deny" | "allow_session" | "allow_always"
  hmac?: string
}

export type AiRuntime = {
  start(request: GenerationRequest): Promise<{ runId: string }>
  stream(runId: string): AsyncIterable<RuntimeEvent>
  decideApproval(input: ApprovalDecisionInput): Promise<void>
  abort(runId: string): Promise<void>
  resume(runId: string): Promise<void>
}

export type RuntimeAdapters = {
  emit: (event: RuntimeEvent) => void
  persistRun?: (runId: string, status: string, checkpoint?: string) => void
  now?: () => number
}
