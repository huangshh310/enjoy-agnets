/**
 * 首字前失败卡「再发一次」/「再试一次」：只重发被留下的那一句（字 + 它自己的附件），输入框里的新草稿不动（jojo P2，r4）。
 * 那一句被改过 / 被并进别的句子 / 图被删 / 没有还稿快照 → 不发（leo r5 fail closed；按钮本就隐藏，这里再兜一次）。
 * 判定见 retry-kept-draft-plan（纯函数，有行为测试）。
 */
import { useSyncExternalStore } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { sendComposerMessage } from "@renderer/hooks/send-composer"
import { retryFailedUserTurn } from "@renderer/hooks/regenerate-turn"
import { listComposerAssets, removeComposerAsset, subscribeComposerAssets } from "@renderer/hooks/composer-assets"
import { readComposerForMerge, writeComposerAfterMerge } from "@renderer/stores/composer-io"
import {
  getRestoredImagesSnapshots,
  restoredImagesFor,
  subscribeRestoredImages
} from "@renderer/stores/restored-images-snapshot"
import { composerWithoutKept, retryKeptDraftPlan, type RetryKeptDraftPlan } from "./retry-kept-draft-plan"

function keptFor(sessionId: string | null) {
  return restoredImagesFor(sessionId)?.kept ?? null
}

/** 此刻点按钮会怎么走（按钮显隐和点击用同一判定）。 */
export function currentRetryKeptDraftPlan(
  state: { sessionId: string | null; messages: readonly ThreadMessage[]; composer: string },
  composerText: string = state.composer
): RetryKeptDraftPlan {
  const kept = keptFor(state.sessionId)
  return retryKeptDraftPlan({
    kept: kept ? { text: kept.text, assetIds: kept.assets.map((a) => a.id) } : null,
    lastUserPending: state.messages.at(-1)?.role === "user",
    composer: composerText,
    composerAssetIds: listComposerAssets().map((a) => a.id)
  })
}

export function retryKeptDraft(): void {
  const state = useChatStore.getState()
  const current = readComposerForMerge(state.composer)
  const plan = currentRetryKeptDraftPlan(state, current)
  const kept = keptFor(state.sessionId)
  if (plan === "resend-kept" && kept) {
    // 先把那一句（整行）和它自己的 chip 从输入框摘掉，剩下的新草稿一字不动；再按「已备好的一条」发出，不读输入框。
    const next = composerWithoutKept(current, kept.text)
    if (next === null) return
    if (next !== current) {
      state.setComposer(next)
      writeComposerAfterMerge(next)
    }
    for (const asset of kept.assets) removeComposerAsset(asset.id)
    void sendComposerMessage({ content: kept.text, assets: kept.assets })
    return
  }
  const last = state.messages.at(-1)
  if (plan === "retry-turn" && last?.role === "user") void retryFailedUserTurn(last)
  // none：fail closed，绝不自动发输入框。
}

let composerAssetsVersion = 0
const assetListeners = new Set<() => void>()
let unsubscribeAssets: (() => void) | null = null
function subscribeAssetsVersion(listener: () => void): () => void {
  assetListeners.add(listener)
  unsubscribeAssets ??= subscribeComposerAssets(() => {
    composerAssetsVersion++
    for (const l of assetListeners) l()
  })
  return () => {
    assetListeners.delete(listener)
    if (assetListeners.size === 0 && unsubscribeAssets) {
      unsubscribeAssets()
      unsubscribeAssets = null
    }
  }
}

/** 卡上要不要给「再发一次」：随输入框字 / chip / 快照 / 线程实时变（leo r5：不满足就隐藏）。 */
export function useRetryKeptDraftAvailable(): boolean {
  useSyncExternalStore(subscribeRestoredImages, getRestoredImagesSnapshots)
  useSyncExternalStore(subscribeAssetsVersion, () => composerAssetsVersion)
  const sessionId = useChatStore((s) => s.sessionId)
  const messages = useChatStore((s) => s.messages)
  const composer = useChatStore((s) => s.composer)
  return currentRetryKeptDraftPlan({ sessionId, messages, composer }) !== "none"
}
