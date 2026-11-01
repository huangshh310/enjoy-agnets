/**
 * 运行中纠偏：有 ActiveRun 走 agent.steer；没有则 idle 新开一轮、仍 running 改排队。
 */
import { STEER_IMAGES_UNSUPPORTED } from "@enjoy-agents/ipc-contract/quoted-context"
import { getIde, hasIde } from "../../lib/ide"
import { useChatStore } from "../../stores/chat-store"
import { steerFallbackWhenNoRun } from "../composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "../followup-queue"
import { markDraftAssetsQueued } from "../../lib/session-draft-storage"
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

/**
 * steered：已交给当前 run；sent：没有活 run，已按新一轮发出（失败由发送链自己还稿）；
 * requeue：排队项应原样放回队列；failed：纠偏失败（排队项要放回，见 leo MUST 1）。
 */
export type SteerOutcome = "steered" | "sent" | "requeue" | "failed" | "images_unsupported"

export async function steerPreparedText(content: string, opts: SteerOptions = {}): Promise<SteerOutcome> {
  return steerComposer(content, opts)
}

async function steerComposer(content: string, opts: SteerOptions): Promise<SteerOutcome> {
  const store = useChatStore.getState()
  const assets = opts.assets ?? []
  const clearDraft = () => {
    if (!opts.fromQueue) clearComposerDraft()
  }
  if (!store.running) {
    clearDraft()
    await sendComposerMessage(assets.length ? { content, assets } : { content })
    return "sent"
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
    return "steered"
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    if (raw.includes("STEER_NO_ACTIVE_RUN")) {
      return fallbackSteerWithoutRun(content, opts)
    }
    if (raw.includes(STEER_IMAGES_UNSUPPORTED)) return "images_unsupported"
    store.setError(raw)
    return "failed"
  }
}

/** 没有 ActiveRun：已 idle 立刻新开一轮，否则进 followup 等自启。 */
async function fallbackSteerWithoutRun(content: string, opts: SteerOptions): Promise<SteerOutcome> {
  const store = useChatStore.getState()
  const assets = opts.assets ?? []
  if (steerFallbackWhenNoRun(store.running) === "send") {
    if (!opts.fromQueue) clearComposerDraft()
    await sendComposerMessage(assets.length ? { content, assets } : { content })
    return "sent"
  }
  // 排队项：原样放回（同一 id，草稿里的排队标记还对得上），不另起新项。
  if (opts.fromQueue) return "requeue"
  const item = enqueueFollowup({ sessionId: store.sessionId ?? "", prompt: content, assets })
  // kai send-p2 A：输入框插话带的图随这条排队走——草稿附件改打排队标记（同输入框排队），切回不冒、马上发失败找得回。
  if (store.sessionId && item.assets?.length) markDraftAssetsQueued(store.sessionId, item.id, content, item.assets)
  if (!opts.fromQueue) clearComposerDraft()
  setRuntimeHint("queued", store.sessionId)
  return "requeue"
}
