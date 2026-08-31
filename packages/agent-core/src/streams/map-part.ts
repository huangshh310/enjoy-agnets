/**
 * AI SDK 7 fullStream 部件 → StreamEvent。
 * 兼容 reasoning / reasoning-delta，以及 text / delta / reasoning_content。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

export function mapStreamPart(part: Record<string, unknown>, runId: string): StreamEvent | null {
  const type = String(part.type ?? "")
  const text = readPartText(part)

  if (type === "text-delta") {
    return { type: "text.delta", runId, text }
  }
  if (type === "reasoning-delta" || type === "reasoning") {
    return text ? { type: "reasoning.delta", runId, text } : null
  }
  const lifecycle = mapLifecyclePart(part, runId)
  if (lifecycle) return lifecycle
  return mapToolPart(part, runId)
}

function mapLifecyclePart(part: Record<string, unknown>, runId: string): StreamEvent | null {
  const type = String(part.type ?? "")
  if (type === "text-start" || type === "text-begin") {
    return { type: "message.part.start", runId, partId: String(part.id ?? "text"), partType: "text" }
  }
  if (type === "text-end") {
    return { type: "message.part.end", runId, partId: String(part.id ?? "text") }
  }
  if (type === "start-step" || type === "step-start") {
    return { type: "step.start", runId, stepId: String(part.id ?? part.stepId ?? "step") }
  }
  if (type === "finish-step" || type === "step-finish") {
    return { type: "step.end", runId, stepId: String(part.id ?? part.stepId ?? "step") }
  }
  if (type === "finish" || type === "usage") {
    const usage = asRecord(part.usage ?? part.totalUsage ?? part)
    const inputTokens = numberOf(usage.inputTokens ?? usage.promptTokens)
    const outputTokens = numberOf(usage.outputTokens ?? usage.completionTokens)
    const totalTokens = numberOf(usage.totalTokens) ?? sumTokens(inputTokens, outputTokens)
    if (inputTokens == null && outputTokens == null && totalTokens == null) return null
    return { type: "usage.updated", runId, inputTokens, outputTokens, totalTokens }
  }
  return null
}

function mapToolPart(part: Record<string, unknown>, runId: string): StreamEvent | null {
  const type = String(part.type ?? "")
  const toolCall = asRecord(part.toolCall)
  const toolCallId = readToolId(part) || readToolId(toolCall)
  const name = String(part.toolName ?? toolCall.toolName ?? "tool")
  const args = part.input ?? part.args ?? toolCall.input ?? toolCall.args
  if (type === "tool-input-start" || type === "tool-call-streaming-start") {
    return { type: "tool.start", runId, toolCallId, name }
  }
  if (type === "tool-input-delta" || type === "tool-call-delta") {
    return {
      type: "tool.args.delta",
      runId,
      toolCallId,
      delta: String(part.inputTextDelta ?? part.delta ?? part.argsTextDelta ?? "")
    }
  }
  if (type === "tool-input-available" || type === "tool-call") {
    return { type: "tool.start", runId, toolCallId, name, args }
  }
  if (type === "tool-result") {
    return { type: "tool.result", runId, toolCallId, name, result: part.output ?? part.result, args }
  }
  if (type === "tool-error" || type === "tool-output-error") {
    return {
      type: "tool.result",
      runId,
      toolCallId,
      name,
      args,
      error: stringifyError(part.error ?? part.errorText)
    }
  }
  if (type === "tool-output-denied") {
    return { type: "tool.result", runId, toolCallId, name, args, error: "Denied" }
  }
  if (type === "tool-approval-request") {
    return {
      type: "approval.required",
      runId,
      toolCallId,
      approvalId: String(part.approvalId ?? ""),
      name,
      args
    }
  }
  return null
}

function numberOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function sumTokens(input?: number, output?: number): number | undefined {
  if (input == null && output == null) return undefined
  return (input ?? 0) + (output ?? 0)
}

function readPartText(part: Record<string, unknown>): string {
  if (typeof part.text === "string" && part.text) return part.text
  if (typeof part.delta === "string" && part.delta) return part.delta
  if (typeof part.reasoning_content === "string") return part.reasoning_content
  return ""
}

function readToolId(part: Record<string, unknown>): string {
  return String(part.toolCallId ?? part.id ?? "")
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringifyError(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value
  if (value instanceof Error) return value.message
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message: unknown }).message)
  }
  return value == null ? "Tool failed." : String(value)
}
