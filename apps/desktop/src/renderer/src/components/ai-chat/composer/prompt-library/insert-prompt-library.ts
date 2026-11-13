/**
 * 插入 = 只写当前草稿。不 submit；不改在跑轮/审批卡；不带回也不偷清 Chip。
 * library 不切引擎 → 允许 running 时预填下一句。
 * 勿误套 apply-composer-preset 的 running||pendingApproval 早退。
 */
import { useChatStore } from "../../../../stores/chat-store.ts"
import { syncComposerDom } from "../../../../hooks/runtime-interact/composer-draft.ts"

export function insertPromptLibraryText(text: string): { running: boolean } {
  const store = useChatStore.getState()
  store.setComposer(text)
  syncComposerDom(text, true)
  return { running: Boolean(store.running) }
}
