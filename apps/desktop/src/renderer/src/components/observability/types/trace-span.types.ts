/**
 * Trace Span 树状时序图元数据与节点类型定义：
 * 深度兼容 OpenTelemetry / Vercel AI SDK 7 / OpenInference 语义规范。
 */

export type SpanKind =
  | "agent"
  | "workflow"
  | "chat"
  | "retrieval"
  | "tool"
  | "function"
  | "embeddings"
  | "http"
  | "stream"

export interface SpanNode {
  id: string
  name: string
  kind: SpanKind
  operation: string
  status: "success" | "error" | "running"
  startOffsetMs: number
  durationMs: number
  ttfoMs?: number
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  cost?: number
  model?: string
  children?: SpanNode[]
  input?: {
    role: "user" | "system" | "tool"
    content: string
  }
  output?: {
    role: "assistant" | "tool"
    content: string
  }
  metadata?: Record<string, unknown>
  attributes?: Record<string, string | number | boolean>
  error?: string
}

export interface TraceSummaryData {
  traceId: string
  name: string
  status: "success" | "error" | "running"
  totalDurationMs: number
  firstTokenMs?: number
  totalSpans: number
  errorSpans: number
  inputTokens: number
  outputTokens: number
  reasoningTokens?: number
  /** 未知省略，不要写 0。 */
  estimatedCost?: number
  startedAt: string
  framework: string
  environment: string
  rootSpan: SpanNode
}
