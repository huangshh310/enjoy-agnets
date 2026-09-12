/**
 * Agent 跑完：落库、记 TTFO、发 run.end。从 agent-runner 拆出以免超行。
 */
import { tokensPerSecond, ttfoMs } from "@enjoy-agents/agent-core"
import { persistActiveRun } from "./flush-agent-run"
import { recordMetric } from "./telemetry-service"
import { settleRun } from "./agent-run-state"
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
  // 摘要给 Workflow / Automation 的 waitForRunSettle 用：子 run 的真实产出尾巴。
  settleRun(runId, { status: "end", summary: transcriptTail(run.transcript.visible) })
  input.emit({ type: "run.end", runId })
}

const TAIL_CHARS = 800

function transcriptTail(visible: string): string {
  const trimmed = visible.trim()
  if (trimmed.length <= TAIL_CHARS) return trimmed
  return trimmed.slice(-TAIL_CHARS)
}
