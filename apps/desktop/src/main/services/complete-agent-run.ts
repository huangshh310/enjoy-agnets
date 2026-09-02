/**
 * Agent 跑完：落库、记 TTFO、发 run.end。从 agent-runner 拆出以免超行。
 */
import { tokensPerSecond, ttfoMs } from "@enjoy-agents/agent-core"
import { persistActiveRun } from "./flush-agent-run"
import { recordMetric } from "./telemetry-service"
import type { ActiveRun } from "./agent-run-state"

export function completeAgentRun(input: {
  runId: string
  run: ActiveRun
  emit: (event: { type: "run.end"; runId: string }) => void
}): void {
  const { run, runId } = input
  persistActiveRun(run, runId, "completed")
  const durationMs = Date.now() - run.startedAt
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "completed",
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    durationMs,
    ttfoMs: ttfoMs(run.startedAt, run.firstTokenAt),
    tokensPerSecond: tokensPerSecond(run.outputTokens, durationMs)
  })
  input.emit({ type: "run.end", runId })
}
