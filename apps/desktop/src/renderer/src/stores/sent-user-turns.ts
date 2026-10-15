/**
 * leo r5 MUST 2：后台出字前回滚的 run.error 不带被撕掉的那一句——renderer 在发出时（乐观用户泡）按会话记下
 * 这一句的原文和它自己的附件；这一轮站住（出字 / run.end）就忘掉，前台回滚取走，后台回滚拿它拍还稿快照。
 * 叶子模块：不依赖 store。
 */
import type { ThreadAsset } from "./chat-store.types"

export type SentUserTurn = {
  text: string
  assets: Array<{ id: string; name: string; mediaType?: string }>
  /** 发出时线程里没有别的用户句：这是会话第一句（自动标题来自它，jojo r5 P2）。 */
  first: boolean
}

const turns = new Map<string, SentUserTurn>()

export function noteSentUserTurn(
  sessionId: string | null | undefined,
  text: string,
  assets: readonly ThreadAsset[] | undefined,
  first: boolean
): void {
  if (!sessionId) return
  turns.set(sessionId, {
    text,
    first,
    assets: (assets ?? []).map((a) => ({ id: a.assetId, name: a.name, ...(a.mediaType ? { mediaType: a.mediaType } : {}) }))
  })
}

export function forgetSentUserTurn(sessionId: string | null | undefined): void {
  if (sessionId) turns.delete(sessionId)
}

export function takeSentUserTurn(sessionId: string | null | undefined): SentUserTurn | null {
  if (!sessionId) return null
  const turn = turns.get(sessionId) ?? null
  turns.delete(sessionId)
  return turn
}

export function resetSentUserTurnsForTest(): void {
  turns.clear()
}
