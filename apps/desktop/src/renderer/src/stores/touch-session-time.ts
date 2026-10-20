/**
 * #160 巡检 5：侧栏会话时间只在整份工作区刷新时更新，发完一句 / 一轮跑完都还停在旧时间。
 * main 在用户话落库、一轮结束时都会顶 sessions.updated_at（persist-session）；渲染端在同样的时刻
 * （run.start ≈ 用户刚发出、run.end / run.error = 一轮结束）把对应会话节点的 updatedAt 顶到现在，不再整份重拉。
 */
import { useChatStore } from "./chat-store"

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

/** 这几种事件之后会话的「最近活动时间」变了。 */
export function bumpsSessionTime(type: string): boolean {
  return type === "run.start" || type === "run.end" || type === "run.error"
}
