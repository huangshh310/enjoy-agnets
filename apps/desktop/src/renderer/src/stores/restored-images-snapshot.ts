/**
 * leo r4 soft4：白卡「图片已放回…」只说这次回滚真还回了几张图——在还稿那一刻拍快照，
 * 不实时数输入框（回滚后再贴的图不算，只回了字的回滚之后贴图也不说「文字和图片已放回」）。
 * jojo P2（r4）：同一份快照也记下这次回滚还回的那一句（字 + 它自己的附件），「再发一次」只重发这一句。
 * leo r5 MUST 2：按会话存（切走再切回、后台回滚都在）；只在这个会话开跑新一轮 / 发起新一发时清，
 * 不随任意 setError 清（切会话会 setError(null)）。没有快照 → 不给「再发一次」。
 */
import { isImageMediaType } from "@enjoy-agents/assets/media-type"

export type KeptSentence = { text: string; assets: Array<{ id: string; name: string; mediaType?: string }> }

export type RestoredImagesSnapshot = { sessionId: string; images: number; hasText: boolean; kept: KeptSentence }

/** 不可变：每次改动换新对象，useSyncExternalStore 靠引用判变化。 */
let snapshots: Readonly<Record<string, RestoredImagesSnapshot>> = {}
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function noteRestoredImages(
  sessionId: string | null | undefined,
  assets: readonly { id: string; name: string; mediaType?: string }[],
  restoredText: string
): void {
  if (!sessionId) return
  snapshots = {
    ...snapshots,
    [sessionId]: {
      sessionId,
      images: assets.filter((a) => isImageMediaType(a.mediaType ?? "")).length,
      hasText: restoredText.trim().length > 0,
      kept: {
        text: restoredText,
        assets: assets.map((a) => ({ id: a.id, name: a.name, ...(a.mediaType ? { mediaType: a.mediaType } : {}) }))
      }
    }
  }
  notify()
}

/** 清一个会话的快照（这个会话开跑新一轮 / 发起新一发）。不传会话 = 全清（只给测试用）。 */
export function clearRestoredImages(sessionId?: string | null): void {
  if (sessionId === undefined) {
    if (Object.keys(snapshots).length === 0) return
    snapshots = {}
    notify()
    return
  }
  if (!sessionId || !snapshots[sessionId]) return
  const { [sessionId]: _dropped, ...rest } = snapshots
  snapshots = rest
  notify()
}

export function restoredImagesFor(sessionId: string | null | undefined): RestoredImagesSnapshot | null {
  return sessionId ? (snapshots[sessionId] ?? null) : null
}

export function getRestoredImagesSnapshots(): Readonly<Record<string, RestoredImagesSnapshot>> {
  return snapshots
}

export function subscribeRestoredImages(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
