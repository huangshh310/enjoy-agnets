/**
 * Agent 跑完：落库、记 TTFO、发 run.end。从 agent-runner 拆出以免超行。
 */
import { tokensPerSecond, ttfoMs } from "@enjoy-agents/agent-core"
import { persistActiveRun } from "./flush-agent-run"
import { persistRunUsageFromActive } from "./run-usage"
import { billingContextOf, enrichUsageEvent } from "./enrich-usage-cost"
import { recordMetric } from "./telemetry-service"
import { settleRun } from "./agent-run-state"
import { clearCatchUpApprovalTimeout } from "./automations-catchup-timer"
import type { ActiveRun } from "./agent-run-state"

export function completeAgentRun(input: {
  runId: string
  run: ActiveRun
  emit: (event: { type: "run.end"; runId: string }) => void
}): void {
  const { run, runId } = input
  clearCatchUpApprovalTimeout(runId)
  // 取消 / abort 后泵可能仍走到这里；禁止覆盖 cancelled、禁止发 run.end。
  if (run.userCancelled || run.abort.signal.aborted) return
  persistActiveRun(run, runId, "completed")
  persistRunUsageFromActive(runId, run)
  recordCompletedRunMetric(runId, run)
  // 摘要给 Workflow / Automation 的 waitForRunSettle 用：子 run 的真实产出尾巴。
  settleRun(runId, { status: "end", summary: transcriptTail(run.transcript.visible) })
  input.emit({ type: "run.end", runId })
}

function recordCompletedRunMetric(runId: string, run: ActiveRun): void {
  const durationMs = Date.now() - run.startedAt
  const estimate = enrichUsageEvent(
    {
      type: "usage.updated",
      runId,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      noCacheTokens: run.noCacheTokens,
      cacheReadTokens: run.cacheReadTokens,
      cacheWriteTokens: run.cacheWriteTokens,
      reasoningTokens: run.reasoningTokens,
      reportedCostUsd: run.reportedCostUsd
    },
    billingContextOf(run)
  ).estimatedCost
  recordMetric({
    runId,
    kind: "agent",
    modelId: run.input.modelId,
    status: "completed",
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    cacheReadTokens: run.cacheReadTokens,
    cacheWriteTokens: run.cacheWriteTokens,
    reasoningTokens: run.reasoningTokens,
    estimatedCostUsd: estimate?.status === "estimated" ? estimate.usd : undefined,
    costStatus: estimate?.status,
    durationMs,
    ttfoMs: ttfoMs(run.startedAt, run.firstTokenAt),
    tokensPerSecond: tokensPerSecond(run.outputTokens, durationMs)
  })
}

const TAIL_CHARS = 800

function transcriptTail(visible: string): string {
  const trimmed = visible.trim()
  if (trimmed.length <= TAIL_CHARS) return trimmed
  return trimmed.slice(-TAIL_CHARS)
}
