/**
 * 用户点过停止的 run（jojo 211e3bbb 1c / luna m211-50）：迟到的 approval.required、run.start 一律丢——
 * 它们会把卡、停止按钮、「执行中 / 正在写」挂回来，起步窗口里还会让随后的认领成功、那一轮整段跑完。
 * 批准 / 拒绝点了也不发、不出红卡。
 * 起步窗口（runId 还没认领）里停的：先记会话；认领前这个会话空闲时冒出来的 run.start / 审批卡就是那一轮的，
 * 记下它的 runId 再丢（调用方负责 abort）。认领（不论成败）就清掉会话标记。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { isComposerRunStart } from "../stores/stream-run-scope"

const STOPPED_CAP = 200
const stoppedRuns = new Set<string>()
const stoppedBeforeClaim = new Set<string>()

export function noteRunStopped(runId: string | null | undefined): void {
  if (!runId) return
  stoppedRuns.add(runId)
  if (stoppedRuns.size > STOPPED_CAP) {
    const oldest = stoppedRuns.values().next().value
    if (oldest) stoppedRuns.delete(oldest)
  }
}

export function isRunStopped(runId: string | null | undefined): boolean {
  return Boolean(runId) && stoppedRuns.has(runId as string)
}

export function noteStoppedBeforeClaim(sessionId: string | null | undefined): void {
  if (sessionId) stoppedBeforeClaim.add(sessionId)
}

export function clearStoppedBeforeClaim(sessionId: string | null | undefined): void {
  if (sessionId) stoppedBeforeClaim.delete(sessionId)
}

/**
 * 这条（审批卡 / 开跑）属于用户已停止的一轮吗。"stopped"：runId 已记过；"beforeClaim"：起步窗口里停的那一轮（刚记下，要 abort）。
 */
export function lateStoppedEvent(
  event: StreamEvent,
  sessionId: string | undefined,
  composer: { sessionId: string | null; runId: string | null; running: boolean }
): "stopped" | "beforeClaim" | null {
  if (event.type !== "approval.required" && event.type !== "run.start") return null
  if (!event.runId) return null
  if (isRunStopped(event.runId)) return "stopped"
  if (event.type === "run.start" && !isComposerRunStart(event)) return null
  if (!sessionId || !stoppedBeforeClaim.has(sessionId)) return null
  if (event.runId === composer.runId) return null
  if (composer.sessionId === sessionId && composer.running) return null
  noteRunStopped(event.runId)
  return "beforeClaim"
}

export function resetStoppedRunsForTest(): void {
  stoppedRuns.clear()
  stoppedBeforeClaim.clear()
}
