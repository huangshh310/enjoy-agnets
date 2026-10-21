/**
 * luna P3：离开一个空的「新对话」（没有消息、没在跑、输入框没字、没附加物、不在建会话/首发中）就删掉它。
 * main 侧 onlyIfEmpty 再兜一次：有落库消息 / run / 草稿 / 心跳 / 标记 / 目标 / run 正在启动都不删。
 */
import { getIde, hasIde } from "../lib/ide"
import { listFollowups } from "./followup-queue"
import { readPendingRewind } from "./rewind-pending"

export type LeaveState = {
  sessionId: string | null
  messages: ReadonlyArray<unknown>
  running: boolean
  runId?: string | null
  composer: string
  /** leo BLOCK ④(a)：附件 / 引用 / 知识 Chip / 技能。 */
  hasExtras?: boolean
  /** leo BLOCK ④(b)：建会话 / 首发准备中。 */
  preparingHint?: boolean
  preparingSessionId?: string | null
  createPending?: boolean
  queuedSend?: boolean
  /** leo BLOCK #163 ①：这个会话还有排队的 followup（运行中排的，首字前失败回滚后会话又是空的）。 */
  queuedFollowups?: boolean
}

export function emptySessionToDiscardOnLeave(state: LeaveState, nextSessionId: string | null): string | null {
  const id = state.sessionId
  if (!id || id === nextSessionId) return null
  if (state.messages.length > 0 || state.running || state.runId) return null
  if (state.composer.trim()) return null
  if (state.hasExtras) return null
  if (state.createPending || state.queuedSend) return null
  // leo BLOCK #163 ①：还有排队的话（只在内存里）删了会话就把用户打的字一起丢了。快照没带上也再查一次队列。
  if (state.queuedFollowups || listFollowups(id).length > 0) return null
  // #167 leo r4 e)：「从这里重来」截掉了第一条消息、原话还在等放回输入框——会话看着是空的，删了原话就没地方去。
  if (readPendingRewind(id)) return null
  if (state.preparingHint && (state.preparingSessionId === null || state.preparingSessionId === id)) return null
  return id
}

/** leo soft：真删之前再确认一次它已经不是当前会话（切换被撤回 / 又点回来时不删）。 */
export function stillLeft(id: string, currentSessionId: () => string | null): boolean {
  return currentSessionId() !== id
}

export function discardEmptySessionOnLeave(
  state: LeaveState,
  nextSessionId: string | null,
  currentSessionId: () => string | null = () => null
): void {
  const id = emptySessionToDiscardOnLeave(state, nextSessionId)
  if (!id || !hasIde()) return
  // 放到微任务：loadSession 同步切完 setSession 后再复核。
  void Promise.resolve()
    .then(() => (stillLeft(id, currentSessionId) ? getIde().session.delete({ sessionId: id, onlyIfEmpty: true }) : undefined))
    .then(async (result) => {
      // luna P2：库里删了但侧栏不刷，空行要等重启才消失。删成功就刷工作区会话列表。
      if ((result as { deleted?: boolean } | undefined)?.deleted !== true) return
      const { refreshAllWorkspaces } = await import("./refresh-workspaces")
      await refreshAllWorkspaces()
    })
    .catch((error: unknown) => {
      console.warn("[session] 离开时删除空会话失败", id, error)
    })
}
