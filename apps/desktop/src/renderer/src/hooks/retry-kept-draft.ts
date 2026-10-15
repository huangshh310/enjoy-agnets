/**
 * 首字前失败卡「再发一次」：只重发被留下的那一句（字 + 它自己的附件），输入框里的新草稿不动（jojo P2，r4）。
 * 判定见 retry-kept-draft-plan（纯函数，有行为测试）。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { sendComposerMessage } from "@renderer/hooks/send-composer"
import { retryFailedUserTurn } from "@renderer/hooks/regenerate-turn"
import { listComposerAssets, removeComposerAsset } from "@renderer/hooks/composer-assets"
import { readComposerForMerge, writeComposerAfterMerge } from "@renderer/stores/composer-io"
import { restoredImagesFor } from "@renderer/stores/restored-images-snapshot"
import { composerWithoutKept, retryKeptDraftPlan } from "./retry-kept-draft-plan"

export function retryKeptDraft(): void {
  const state = useChatStore.getState()
  const kept = restoredImagesFor(state.sessionId)?.kept ?? null
  const last = state.messages.at(-1)
  const plan = retryKeptDraftPlan({
    kept: kept ? { text: kept.text, assetCount: kept.assets.length } : null,
    lastUserPending: last?.role === "user",
    composer: state.composer,
    composerAssetCount: listComposerAssets().length
  })
  if (plan === "resend-kept" && kept) {
    // 先把那一句从输入框摘掉（字 + 它自己的图），剩下的新草稿留在框里；再按「已备好的一条」发出，不读输入框。
    const current = readComposerForMerge(state.composer)
    const next = composerWithoutKept(current, kept.text)
    if (next !== current) {
      state.setComposer(next)
      writeComposerAfterMerge(next)
    }
    for (const asset of kept.assets) removeComposerAsset(asset.id)
    void sendComposerMessage({ content: kept.text, assets: kept.assets })
    return
  }
  if (plan === "retry-turn" && last?.role === "user") {
    void retryFailedUserTurn(last)
    return
  }
  if (plan === "send") void sendComposerMessage()
}
