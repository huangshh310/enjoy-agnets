/**
 * 排队自启：idle 后取出下一项再开 agent.run。
 * 发送走 DrainableQueue：drain 等到当前项 send 结束，不只看队列空。
 */
import { DrainableQueue } from "@enjoy-agents/agent-core/drainable-queue"
import type { FollowupItem } from "./followup-queue.ts"
import { followupPausedReason, takeNextFollowup } from "./followup-queue.ts"
import { releaseQueuedDraftAssets } from "../lib/session-draft-storage.ts"

type FollowupJob = {
  item: FollowupItem
  send: (item: FollowupItem) => Promise<void>
}

let queue = new DrainableQueue<FollowupJob>(runJob)
/**
 * 取下一项时 takeNextFollowup 会同步 notify，订阅它的自启（useFollowupAutostart 的 kick）会重入进来：
 * 那时这一项还没进 queue（size 仍为 0），重入的一次会把**第二条**先取走先发——排队顺序颠倒（E1 实测）。
 * 取项到入队之间不许重入。
 */
let starting = false

/** 还在「开始发」的自启项，按会话计数（leo #169 BLOCK：别的会话的自启不算这个会话在跑）。 */
let inFlightBySession = new Map<string, number>()

function bump(sessionId: string, delta: number) {
  const next = (inFlightBySession.get(sessionId) ?? 0) + delta
  if (next > 0) inFlightBySession.set(sessionId, next)
  else inFlightBySession.delete(sessionId)
}

async function runJob(job: FollowupJob) {
  try {
    // 发送链接手这几张图（发出即由 main 清库；失败还回输入框当普通草稿），排队标记先摘掉。
    if (job.item.assets.length) releaseQueuedDraftAssets(job.item.sessionId, job.item.id)
    await job.send(job.item)
  } finally {
    bump(job.item.sessionId, -1)
  }
}

/** 测试用：换一条空队列。 */
export function resetFollowupAutostart() {
  queue = new DrainableQueue<FollowupJob>(runJob)
  inFlightBySession = new Map()
  starting = false
}

/**
 * 自启取出的那一条还在「开始发」阶段（send 没返回：agent.run 还没回执、还没出字）。
 * luna #163 P2⑤：这时换助手也算停了一轮——abortComposerRun 靠它补上 store.running 看不到的起跑窗口。
 */
export function followupSendInFlight(sessionId: string | null | undefined): boolean {
  return Boolean(sessionId) && (inFlightBySession.get(sessionId as string) ?? 0) > 0
}

export function drainFollowupAutostart(): Promise<void> {
  return queue.drain()
}

/** 尝试取出并发送下一项。已在跑、审批等待、正在发送，或队列因停止 / 出错 / 额度停着（E1）则跳过。 */
export function tryStartNextFollowup(input: {
  sessionId: string | null | undefined
  running: boolean
  /** waiting_review 时不要自启，避免审批卡片还在就开下一轮。 */
  pendingApproval?: boolean
  send: (item: FollowupItem) => Promise<void>
}): boolean {
  if (input.running || input.pendingApproval || !input.sessionId || queue.size > 0) return false
  if (followupPausedReason(input.sessionId) || starting) return false
  starting = true
  try {
    const next = takeNextFollowup(input.sessionId)
    if (!next) return false
    bump(next.sessionId, 1)
    queue.enqueue({ item: next, send: input.send })
    return true
  } finally {
    starting = false
  }
}
