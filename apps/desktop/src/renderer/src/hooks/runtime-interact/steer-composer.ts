/**
 * 运行中纠偏：有 ActiveRun 走 agent.steer；没有则 idle 新开一轮、仍 running 改排队。
 */
import { getIde, hasIde } from "../../lib/ide"
import { useChatStore } from "../../stores/chat-store"
import { steerFallbackWhenNoRun } from "../composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "../followup-queue"
import { clearComposerDraft, prefixHostModeForSend } from "./composer-draft"
import { sendComposerMessage } from "./send-composer-run"
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import type { QueuedComposerAsset } from "../composer-assets"
import type { ThreadAsset } from "../../stores/chat-store.types"

function toThreadAsset(item: QueuedComposerAsset): ThreadAsset {
  return { assetId: item.id, mediaType: resolveMediaType(item.name, item.mediaType), name: item.name, url: item.url }
}

export type SteerOptions = {
  /** 排队项的图：随纠偏一起进当前 run；idle / 无活 run 时随新一轮发出；退回排队时仍挂在项上。 */
  assets?: QueuedComposerAsset[]
  /** 从排队项发出：输入框里用户正打的字不能被清。 */
  fromQueue?: boolean
}

export async function steerPreparedText(content: string, opts: SteerOptions = {}) {
  await steerComposer(content, opts)
}

async function steerComposer(content: string, opts: SteerOptions) {
  const store = useChatStore.getState()
  const assets = opts.assets ?? []
  const clearDraft = () => {
    if (!opts.fromQueue) clearComposerDraft()
  }
  if (!store.running) {
    clearDraft()
    return sendComposerMessage(assets.length ? { content, assets } : { content })
  }
  try {
    if (!hasIde() || !store.sessionId) throw new Error("STEER_NO_ACTIVE_RUN")
    const steered = prefixHostModeForSend(content)
    await getIde().agent.steer({
      sessionId: store.sessionId,
      runId: store.runId ?? undefined,
      text: assets.length && !content.trim() ? "" : steered,
      ...(assets.length ? { attachments: assets.map((a) => a.id) } : {})
    })
    const typing = useChatStore.getState().composer
    store.appendUserMessage(
      assets.length && !content.trim() ? "" : steered,
      assets.length ? assets.map(toThreadAsset) : undefined
    )
    // appendUserMessage 会清 composer；从排队项发出时用户正打的字要留着。
    if (opts.fromQueue && typing) useChatStore.getState().setComposer(typing)
    clearDraft()
    setRuntimeHint("steered", store.sessionId)
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    if (raw.includes("STEER_NO_ACTIVE_RUN")) {
      await fallbackSteerWithoutRun(content, opts)
      return
    }
    store.setError(raw)
  }
}

/** 没有 ActiveRun：已 idle 立刻新开一轮，否则进 followup 等自启。 */
async function fallbackSteerWithoutRun(content: string, opts: SteerOptions) {
  const store = useChatStore.getState()
  const assets = opts.assets ?? []
  if (steerFallbackWhenNoRun(store.running) === "send") {
    if (!opts.fromQueue) clearComposerDraft()
    return sendComposerMessage(assets.length ? { content, assets } : { content })
  }
  enqueueFollowup({ sessionId: store.sessionId ?? "", prompt: content, assets })
  if (!opts.fromQueue) clearComposerDraft()
  setRuntimeHint("queued", store.sessionId)
}
