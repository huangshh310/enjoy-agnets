/**
 * 单次泵的流消费。finally 里标记缺用量，供测试直接调用。
 */
import { consumeFullStream } from "./consume-stream"
import { billingContextOf, enrichUsageEvent } from "./enrich-usage-cost"
import { applyActiveRunUsage, finalizePumpUsage } from "./run-usage"
import { checkpointActiveRun } from "./flush-agent-run"
import { emitEvent, type ActiveRun } from "./agent-run-state"
import { looksLikeSshRoot } from "./ssh/refuse-local-cwd.ts"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"

export async function consumeRun(
  runId: string,
  run: ActiveRun,
  stream: AsyncIterable<Record<string, unknown>>
) {
  // 不要重置 transcript/tools：审批后再泵一轮要叠在同一份上，失败才能整段落库。
  let sawUsage = false
  try {
    await consumeFullStream({
      stream,
      runId,
      window: run.window,
      tools: run.tools,
      transcript: run.transcript,
      onApproval: (pending) => {
        run.pendingApprovals.push(pending)
      },
      onFirstToken: () => {
        run.firstTokenAt = run.firstTokenAt ?? Date.now()
      },
      onUsage: (usage) => {
        if (usage.fromTotalUsage) sawUsage = true
        const { fromTotalUsage: _fromTotalUsage, ...rest } = usage
        applyActiveRunUsage(runId, run, rest, false)
      },
      onCheckpoint: () => {
        checkpointActiveRun(run)
      },
      emit: (event) => {
        const next = event.type === "usage.updated" ? enrichUsageEvent(event, billingContextOf(run)) : event
        emitEvent(run.window, next)
        noteFileChangedCheckpoint(run, runId, event)
      }
    })
  } finally {
    finalizePumpUsage(runId, run, sawUsage)
  }
  checkpointActiveRun(run)
}

function noteFileChangedCheckpoint(run: ActiveRun, runId: string, event: { type: string }): void {
  if (event.type !== "file.changed" || run.checkpointNoted) return
  run.checkpointNoted = true
  if (looksLikeSshRoot(run.workspaceRoot)) return
  void recordEnjoyCheckpoint(run.workspaceRoot, {
    sessionId: run.input.sessionId,
    runId,
    kind: "turn"
  }).catch(() => undefined)
}
