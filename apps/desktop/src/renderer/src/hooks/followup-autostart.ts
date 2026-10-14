/**
 * 排队自启：idle 后取出下一项再开 agent.run。
 * 发送走 DrainableQueue：drain 等到当前项 send 结束，不只看队列空。
 */
import { DrainableQueue } from "@enjoy-agents/agent-core/drainable-queue"
import type { FollowupItem } from "./followup-queue.ts"
import { takeNextFollowup } from "./followup-queue.ts"
import { releaseQueuedDraftAssets } from "../lib/session-draft-storage.ts"

type FollowupJob = {
  item: FollowupItem
  send: (item: FollowupItem) => Promise<void>
}

let queue = new DrainableQueue<FollowupJob>(runJob)

async function runJob(job: FollowupJob) {
  // 发送链接手这几张图（发出即由 main 清库；失败还回输入框当普通草稿），排队标记先摘掉。
  if (job.item.assets.length) releaseQueuedDraftAssets(job.item.sessionId, job.item.id)
  await job.send(job.item)
}

/** 测试用：换一条空队列。 */
export function resetFollowupAutostart() {
  queue = new DrainableQueue<FollowupJob>(runJob)
}

export function drainFollowupAutostart(): Promise<void> {
  return queue.drain()
}

/** 尝试取出并发送下一项。已在跑、审批等待或正在发送则跳过。 */
export function tryStartNextFollowup(input: {
  sessionId: string | null | undefined
  running: boolean
  /** waiting_review 时不要自启，避免审批卡片还在就开下一轮。 */
  pendingApproval?: boolean
  send: (item: FollowupItem) => Promise<void>
}): boolean {
  if (input.running || input.pendingApproval || !input.sessionId || queue.size > 0) return false
  const next = takeNextFollowup(input.sessionId)
  if (!next) return false
  queue.enqueue({ item: next, send: input.send })
  return true
}
