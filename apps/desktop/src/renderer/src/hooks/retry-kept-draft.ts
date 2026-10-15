/**
 * 首字前失败红卡「重试」：输入框有字或有图 → 走发送；输入框空但用户句还在库里 → 原地重跑那一句（不经输入框另发，防重复）。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { sendComposerMessage } from "@renderer/hooks/send-composer"
import { retryFailedUserTurn } from "@renderer/hooks/regenerate-turn"
import { listComposerAssets } from "@renderer/hooks/composer-assets"
import { retryKeptDraftPlan } from "./retry-kept-draft-plan"

export function retryKeptDraft(): void {
  const state = useChatStore.getState()
  const lastUser = [...state.messages].reverse().find((item) => item.role === "user")
  const plan = retryKeptDraftPlan({
    composer: state.composer,
    composerAssetCount: listComposerAssets().length,
    lastUserContent: lastUser?.content
  })
  if (plan === "send") {
    void sendComposerMessage()
    return
  }
  if (plan === "retry-turn" && lastUser) void retryFailedUserTurn(lastUser)
}
