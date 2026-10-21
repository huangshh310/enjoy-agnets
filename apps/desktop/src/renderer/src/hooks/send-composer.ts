/**
 * Composer 提交入口：发送 / 排队 / 纠偏，以及附件导入。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "../lib/ide"
import { fileToBase64 } from "../lib/file-bytes"
import {
  listComposerAssets,
  queueComposerAsset,
  restoreComposerAssets,
  takeComposerAssetDetails,
  type QueuedComposerAsset
} from "./composer-assets"
import { composerCanSend } from "./runtime-interact/composer-can-send"
import { resolveComposerIntent, type ComposerSubmitIntent } from "./composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "./followup-queue"
import type { RuntimeHintCode } from "./runtime-interact/followup-queue.types"
import { forgetPersistedDraftAssets, markDraftAssetsQueued } from "../lib/session-draft-storage"
import { useChatStore } from "../stores/chat-store"
import { traceSend } from "./send-debug"
import { queueComposerFocus } from "./composer-focus"
import {
  clearComposerDraft,
  snapshotComposerDraft,
  takeComposerText,
  type ComposerDraftSnapshot
} from "./runtime-interact/composer-draft"
import { takeComposerEnter } from "./composer-dom"
import { SESSION_NOT_READY } from "./queue-composer-send-copy"
import { sendComposerMessage } from "./runtime-interact/send-composer-run"
import { steerPreparedText } from "./runtime-interact/steer-composer"

export { abortComposerRun } from "./composer-run-control"
export { takeComposerText } from "./runtime-interact/composer-draft"
export { sendComposerMessage } from "./runtime-interact/send-composer-run"
export { steerPreparedText } from "./runtime-interact/steer-composer"

/** 按运行态把 Enter / ⌘Enter 收成发送、排队或纠偏。 */
export async function submitComposer(requested: ComposerSubmitIntent = "send") {
  const typed = takeComposerEnter() ?? undefined
  const store = useChatStore.getState()
  const intent = resolveComposerIntent(store.running, requested)
  traceSend("submit", { intent, running: store.running, sessionId: store.sessionId, typed: typed?.length ?? -1 })
  if (intent === "send") return sendComposerMessage(undefined, typed)

  const { quotes, skills, draft } = snapshotComposerDraft()
  const content = await takeComposerText(typed)
  const assetCount = listComposerAssets().length
  // leo soft：纠偏只能塞文字；只带图的「纠偏」改走排队，不能静默丢。
  const effective = intent === "steer" && !content.trim() && assetCount > 0 ? "queue" : intent
  if (effective === "queue") {
    // 引用 / 知识 / 技能 Chip 已由 takeComposerText 拼进 content（只有 Chip 时 content 也非空），
    // 这里不再单算 hasChips（算了也翻不动结果，是死分支）；附件不进 content，按 assetCount 计。
    if (!composerCanSend({ text: content, assetCount })) return
    if (!store.sessionId) {
      // 运行中又没有会话：不能静默，留稿出提示。
      traceSend("submit:queue-no-session")
      store.setError(SESSION_NOT_READY)
      return
    }
    queueComposerSubmission(store.sessionId, content, { quotes, skills, draft }, takeComposerAssetDetails(), "queued")
    return
  }
  if (!content) return
  // kai send-p2 A（jojo 巡检 46–52）：Ctrl+Enter 插话把托盘里的图一起交给当前 run——和排队行「马上发给它」
  // 同一条路（steerPreparedText 带 assets → agent.steer attachments，main 编进这条 user 消息并清草稿附件）。
  // 运行中收不了图（ACP / 模型看不了图，main 回 STEER_IMAGES_UNSUPPORTED）→ 字和图整条老实排到下一轮，
  // 提示「运行中收不了图…」，绝不出「已收到」；插话失败 → 图回托盘（字本来就还在输入框）。
  const steerAssets = takeComposerAssetDetails()
  const outcome = await steerPreparedText(content, steerAssets.length ? { assets: steerAssets } : {})
  if (steerAssets.length === 0) return
  if (outcome === "steered") {
    // main 已在落库事务里清了这几张草稿附件；renderer 缓存也丢掉，切走再切回不冒旧图。
    forgetPersistedDraftAssets(store.sessionId)
    return
  }
  if (outcome === "images_unsupported" && store.sessionId) {
    queueComposerSubmission(store.sessionId, content, { quotes, skills, draft }, steerAssets, "imageSteerQueued")
    return
  }
  if (outcome === "failed" || outcome === "images_unsupported") restoreComposerAssets(steerAssets)
  // sent / requeue：图已随新一轮 / 排队项走（发送链、排队各自负责失败还稿）。
}

/**
 * 输入框这一条（字 + Chip + 图）排进运行中队列：图在草稿库里改打排队标记（不删），清输入框，给提示。
 * hint：普通排队「queued」；插话收不了图改排队「imageSteerQueued」（说清是排到下一轮，不说已收到）。
 */
function queueComposerSubmission(
  sessionId: string,
  content: string,
  snapshot: ComposerDraftSnapshot,
  assets: QueuedComposerAsset[],
  hint: Extract<RuntimeHintCode, "queued" | "imageSteerQueued">
): void {
  const queuedItem = enqueueFollowup({
    sessionId,
    prompt: content,
    draft: snapshot.draft,
    quotedContexts: snapshot.quotes,
    skillChips: snapshot.skills,
    assets
  })
  // leo MUST 1（#155）：图在草稿库里改打排队标记（不删）——马上发失败 / 崩溃都找得回；
  // 输入框与切回恢复不认带标记的图（jojo P2）。
  markDraftAssetsQueued(sessionId, queuedItem.id, snapshot.draft || content, queuedItem.assets)
  clearComposerDraft()
  setRuntimeHint(hint, sessionId)
}

export async function attachComposerFile(file: File) {
  if (!hasIde()) return
  const previewUrl = URL.createObjectURL(file)
  try {
    const mediaType = resolveMediaType(file.name, file.type)
    const asset = (await getIde().assets.import({
      name: file.name,
      mediaType,
      bytesBase64: await fileToBase64(file)
    })) as { id: string }
    queueComposerAsset({
      id: asset.id,
      name: file.name,
      mediaType,
      size: file.size,
      url: previewUrl
    })
    // jojo P2（#155）：新对话里粘图后附件托盘出现，焦点掉出输入框，Enter 发不出去。附件进托盘后把焦点放回输入框
    // （queueComposerFocus 自带护栏：用户在别的输入框 / 对话框里时不抢）。
    keepComposerFocusAfterAttach()
  } catch (error) {
    URL.revokeObjectURL(previewUrl)
    throw error
  }
}

function keepComposerFocusAfterAttach(): void {
  if (typeof requestAnimationFrame === "undefined") {
    queueComposerFocus()
    return
  }
  requestAnimationFrame(() => queueComposerFocus())
}

export async function attachComposerFiles(files: File[] | FileList) {
  for (const file of Array.from(files)) {
    await attachComposerFile(file)
  }
}
