/**
 * 用户点过停止的 run（jojo 211e3bbb 1c / luna m211-50）：迟到的 approval.required、run.start 一律丢——
 * 它们会把卡、停止按钮、「执行中 / 正在写」挂回来，起步窗口里还会让随后的认领成功、那一轮整段跑完。
 * 批准 / 拒绝点了也不发、不出红卡。
 * 起步窗口（runId 还没认领）里停的：记下在路上那一发的 clientRequestId。main 的 run.start 原样带回它，
 * 回执也按它认——停止后马上再发一句时，新旧两发同会话、都在认领前，按会话猜会认错（host #169 KAI）。
 */
import type { StreamEvent } from "@enjoy-agents/ipc-contract"

const STOPPED_CAP = 200
const stoppedRuns = new Set<string>()
const stoppedRequests = new Set<string>()

function addCapped(set: Set<string>, id: string): void {
  set.add(id)
  if (set.size > STOPPED_CAP) {
    const oldest = set.values().next().value
    if (oldest) set.delete(oldest)
  }
}

export function noteRunStopped(runId: string | null | undefined): void {
  if (runId) addCapped(stoppedRuns, runId)
}

export function isRunStopped(runId: string | null | undefined): boolean {
  return Boolean(runId) && stoppedRuns.has(runId as string)
}

/** 起步窗口里停掉的那一发（还没有 runId）：按它的 clientRequestId 记。 */
export function noteRequestStopped(clientRequestId: string | null | undefined): void {
  if (clientRequestId) addCapped(stoppedRequests, clientRequestId)
}

export function isRequestStopped(clientRequestId: string | null | undefined): boolean {
  return Boolean(clientRequestId) && stoppedRequests.has(clientRequestId as string)
}

/**
 * 这条（审批卡 / 开跑）属于用户已停止的一轮吗。"stopped"：runId 已记过；
 * "beforeClaim"：起步窗口里停掉的那一发的 run.start（按 clientRequestId 认出，刚记下 runId，调用方要 abort）。
 */
export function lateStoppedEvent(event: StreamEvent): "stopped" | "beforeClaim" | null {
  if (event.type !== "approval.required" && event.type !== "run.start") return null
  if (!event.runId) return null
  if (isRunStopped(event.runId)) return "stopped"
  if (event.type !== "run.start" || !isRequestStopped(event.clientRequestId)) return null
  noteRunStopped(event.runId)
  return "beforeClaim"
}

export function resetStoppedRunsForTest(): void {
  stoppedRuns.clear()
  stoppedRequests.clear()
}
