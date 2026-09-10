/**
 * 用 TelemetryMetric 里真实有的字段画 send → TTFO → done。
 * 禁止编造 RAG / MCP / token / 单价。
 */
import type { TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"
import type { SpanNode, TraceSummaryData } from "../types/trace-span.types"

function copy(t: TranslateFn | undefined, key: string, fallback: string) {
  return t ? t(`pages.observability.${key}`) : fallback
}

function runStatus(metric: TelemetryMetric): SpanNode["status"] {
  if (metric.status === "running") return "running"
  if (metric.status === "success" || metric.status === "completed" || metric.status === "ok") {
    return "success"
  }
  return "error"
}

function phaseSpan(input: {
  id: string
  name: string
  kind: SpanNode["kind"]
  operation: string
  status: SpanNode["status"]
  startOffsetMs: number
  durationMs: number
  content: string
}): SpanNode {
  return {
    id: input.id,
    name: input.name,
    kind: input.kind,
    operation: input.operation,
    status: input.status,
    startOffsetMs: input.startOffsetMs,
    durationMs: Math.max(input.durationMs, 0),
    input: { role: "system", content: input.content },
    output: { role: "assistant", content: input.content }
  }
}

/** 只还原指标里存在的时间尺，缺字段就省略，不要填默认 850 token。 */
export function buildTraceDataFromMetric(
  metric: TelemetryMetric,
  t?: TranslateFn
): TraceSummaryData {
  const duration = metric.durationMs ?? 0
  const status = runStatus(metric)
  const ttfo = metric.ttfoMs
  const children: SpanNode[] = []
  const sendLabel = copy(t, "phaseSend", "send")
  children.push(
    phaseSpan({
      id: `${metric.id}-send`,
      name: "run.send",
      kind: "agent",
      operation: "send",
      status,
      startOffsetMs: 0,
      durationMs: 0,
      content: sendLabel
    })
  )
  if (typeof ttfo === "number" && ttfo > 0) {
    children.push(
      phaseSpan({
        id: `${metric.id}-ttfo`,
        name: "run.ttfo",
        kind: "stream",
        operation: "first_token",
        status,
        startOffsetMs: 0,
        durationMs: Math.min(ttfo, duration || ttfo),
        content: copy(t, "phaseTtfo", "TTFO")
      })
    )
  }
  const streamStart = typeof ttfo === "number" && ttfo > 0 ? ttfo : 0
  if (duration > streamStart) {
    children.push(
      phaseSpan({
        id: `${metric.id}-done`,
        name: "run.done",
        kind: "stream",
        operation: "complete",
        status,
        startOffsetMs: streamStart,
        durationMs: duration - streamStart,
        content: copy(t, "phaseStream", "done")
      })
    )
  }

  const rootSpan: SpanNode = {
    id: metric.id,
    name: `run.${metric.kind}`,
    kind: metric.kind === "workflow" ? "workflow" : "agent",
    operation: metric.kind,
    status,
    startOffsetMs: 0,
    durationMs: duration,
    ttfoMs: ttfo,
    inputTokens: metric.inputTokens,
    outputTokens: metric.outputTokens,
    model: metric.modelId,
    children,
    metadata: { runId: metric.runId },
    attributes: {
      "ai.kind": metric.kind,
      ...(metric.modelId ? { "ai.model.id": metric.modelId } : {}),
      ...(typeof metric.inputTokens === "number" ? { "ai.usage.promptTokens": metric.inputTokens } : {}),
      ...(typeof metric.outputTokens === "number"
        ? { "ai.usage.completionTokens": metric.outputTokens }
        : {}),
      ...(typeof metric.tokensPerSecond === "number"
        ? { "ai.response.tokensPerSecond": metric.tokensPerSecond }
        : {})
    },
    error: status === "error" ? metric.errorClass : undefined
  }

  return {
    traceId: metric.runId || metric.id,
    name: `run.${metric.kind}`,
    status,
    totalDurationMs: duration,
    firstTokenMs: ttfo,
    totalSpans: 1 + children.length,
    errorSpans: status === "error" ? 1 : 0,
    inputTokens: metric.inputTokens ?? 0,
    outputTokens: metric.outputTokens ?? 0,
    estimatedCost: 0,
    startedAt: new Date(metric.createdAt).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    framework: "enjoy-agents",
    environment: "desktop",
    rootSpan
  }
}
