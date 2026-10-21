/**
 * 「从这里重来」写不进输入框时，把原话 + 图放进**原会话**草稿（#167 leo BLOCK P2）。
 *
 * 为什么不直接调 restoreDraftIntoSession：它内部用旧的子串合并（mergeComposerText），已有草稿
 * 「look at the book」会把写回的「ok」当成重复吞掉——截断已经成功，原话就没了。
 * session-draft-storage.ts 归 kai，这里不改它：先用 composer-writeback 的按行合并（mergeWritebackText：
 * 一个换行接上、整行去重、子串不算重复）算出合并结果，把它作为原会话的现有草稿写好，
 * 再把同一段交给 restoreDraftIntoSession——两边相同，旧合并原样返回，图仍由它按 id 去重追加（保留 size）。
 */
import { useChatStore } from "../stores/chat-store"
import {
  readPersistedDraft,
  restoreDraftIntoSession,
  writePersistedDraft
} from "../lib/session-draft-storage"
import { mergeWritebackText } from "./composer-writeback"

export type RewindDraftAsset = { id: string; name: string; mediaType?: string; size?: number }

/** 按行合并进原会话草稿（内存草稿 + 落盘），图按 id 去重。返回合并后的正文。 */
export function restoreRewindDraft(sessionId: string, text: string, assets: readonly RewindDraftAsset[] = []): string {
  if (!sessionId) return ""
  const store = useChatStore.getState()
  const memory = store.getSessionDraft(sessionId)
  const before = memory?.text ?? readPersistedDraft(sessionId) ?? ""
  const merged = mergeWritebackText(text, before)
  if (merged !== before) {
    writePersistedDraft(sessionId, merged)
    if (memory) store.saveSessionDraft(sessionId, { ...memory, text: merged })
  }
  // 现有草稿已经是 merged：旧合并见到相同的两段直接留现有，只负责图。
  restoreDraftIntoSession(sessionId, merged, assets)
  return merged
}
