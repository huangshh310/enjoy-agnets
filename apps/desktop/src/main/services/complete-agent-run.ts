/**
 * Agent 跑完：落库、记 TTFO、发 run.end。从 agent-runner 拆出以免超行。
 */
import { tokensPerSecond, ttfoMs } from "@enjoy-agents/agent-core"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { persistFinishedAssistant } from "./persist-parts"
import type { CitedSource } from "./cite-knowledge"
import { recordMetric } from "./telemetry-service"

export function completeAgentRun(input: {
  runId: string
  sessionId: string
  modelId?: string
  content: string
  reasoning: string
  tools: ThreadToolCall[]
  startedAt: number
  firstTokenAt?: number
  inputTokens?: number
  outputTokens?: number
  citedSources: CitedSource[]
  emit: (event: { type: "run.end"; runId: string }) => void
}): void {
  persistFinishedAssistant({
    sessionId: input.sessionId,
    content: input.content,
    reasoning: input.reasoning,
    tools: input.tools,
    startedAt: input.startedAt,
    extras: { sources: input.citedSources }
  })
  const durationMs = Date.now() - input.startedAt
  recordMetric({
    runId: input.runId,
    kind: "agent",
    modelId: input.modelId,
    status: "completed",
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    durationMs,
    ttfoMs: ttfoMs(input.startedAt, input.firstTokenAt),
    tokensPerSecond: tokensPerSecond(input.outputTokens, durationMs)
  })
  input.emit({ type: "run.end", runId: input.runId })
}
