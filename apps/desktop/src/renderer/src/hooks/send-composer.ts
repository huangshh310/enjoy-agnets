/**
 * Composer 提交入口：发送 / 排队 / 纠偏，以及附件导入。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "../lib/ide"
import { fileToBase64 } from "../lib/file-bytes"
import { listComposerAssets, queueComposerAsset, takeComposerAssetsForQueue } from "./composer-assets"
import { composerCanSend } from "./runtime-interact/composer-can-send"
import { resolveComposerIntent, type ComposerSubmitIntent } from "./composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "./followup-queue"
import { useChatStore } from "../stores/chat-store"
import { traceSend } from "./send-debug"
import { queueComposerFocus } from "./composer-focus"
import { clearComposerDraft, snapshotComposerDraft, takeComposerText } from "./runtime-interact/composer-draft"
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
    enqueueFollowup({
      sessionId: store.sessionId,
      prompt: content,
      draft,
      quotedContexts: quotes,
      skillChips: skills,
      assets: takeComposerAssetsForQueue()
    })
    clearComposerDraft()
    setRuntimeHint("queued", store.sessionId)
    return
  }
  if (!content) return
  await steerPreparedText(content)
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
