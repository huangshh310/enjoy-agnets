/**
 * Composer 提交入口：发送 / 排队 / 纠偏，以及附件导入。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "../lib/ide"
import { fileToBase64 } from "../lib/file-bytes"
import { queueComposerAsset, takeComposerAssetDetails } from "./composer-assets"
import { resolveComposerIntent, type ComposerSubmitIntent } from "./composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "./followup-queue"
import { useChatStore } from "../stores/chat-store"
import { clearComposerDraft, snapshotComposerDraft, takeComposerText } from "./runtime-interact/composer-draft"
import { sendComposerMessage } from "./runtime-interact/send-composer-run"
import { steerPreparedText } from "./runtime-interact/steer-composer"

export { abortComposerRun } from "./composer-run-control"
export { takeComposerText } from "./runtime-interact/composer-draft"
export { sendComposerMessage } from "./runtime-interact/send-composer-run"
export { steerPreparedText } from "./runtime-interact/steer-composer"

/** 按运行态把 Enter / ⌘Enter 收成发送、排队或纠偏。 */
export async function submitComposer(requested: ComposerSubmitIntent = "send") {
  const store = useChatStore.getState()
  const intent = resolveComposerIntent(store.running, requested)
  if (intent === "send") return sendComposerMessage()

  const { quotes, skills, draft } = snapshotComposerDraft()
  const content = await takeComposerText()
  if (!content) return
  if (intent === "queue") {
    if (!store.sessionId) return
    enqueueFollowup({
      sessionId: store.sessionId,
      prompt: content,
      draft,
      quotedContexts: quotes,
      skillChips: skills,
      assets: takeComposerAssetDetails()
    })
    clearComposerDraft()
    setRuntimeHint("queued", store.sessionId)
    return
  }
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
  } catch (error) {
    URL.revokeObjectURL(previewUrl)
    throw error
  }
}

export async function attachComposerFiles(files: File[] | FileList) {
  for (const file of Array.from(files)) {
    await attachComposerFile(file)
  }
}
