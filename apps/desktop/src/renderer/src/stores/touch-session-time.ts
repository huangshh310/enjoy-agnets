/**
 * #160 巡检 5：侧栏会话时间只在整份工作区刷新时更新，发完一句 / 一轮跑完都还停在旧时间。
 * main 在用户话落库、一轮结束时都会顶 sessions.updated_at（persist-session）；渲染端在同样的时刻
 * （run.start ≈ 用户刚发出、run.end / run.error = 一轮结束）把对应会话节点的 updatedAt 顶到现在，不再整份重拉。
 */
import { useChatStore } from "./chat-store"
import { isRestoreFamilyEvent } from "./stream-run-scope"

export function touchSessionUpdatedAt(sessionId: string | null | undefined, at = Date.now()): void {
  if (!sessionId) return
  const { repositories } = useChatStore.getState()
  const index = repositories.findIndex((node) => node.kind === "session" && node.id === sessionId)
  if (index < 0) return
  const node = repositories[index]!
  if (node.updatedAt >= at) return
  const next = repositories.slice()
  next[index] = { ...node, updatedAt: at }
  useChatStore.setState({ repositories: next })
}

/**
 * 这几种事件之后会话的「最近活动时间」变了。
 * 恢复家族（重启时把中断的一轮补发成 run.error restore_interrupted_running 等，见
 * main restore-interrupted-running.ts）不是新动静：不顶时间，否则一开 app 旧会话全变「刚刚」（leo #164 P5）。
 * text.delta / approval.required / usage.updated 等中途事件也不顶（R5d）。
 */
export type BumpProbe = { type: string; code?: string; message?: string }

export function bumpsSessionTime(event: BumpProbe): boolean {
  const type = event.type
  if (type !== "run.start" && type !== "run.end" && type !== "run.error") return false
  return !isRestoreFamilyEvent(event)
}
