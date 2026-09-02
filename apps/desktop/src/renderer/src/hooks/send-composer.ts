/**
 * Composer 发送：imagine 走 generateImage，imagine-video 走 generateVideo，其余走 Agent。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "../lib/ide"
import { fileToBase64 } from "../lib/file-bytes"
import { useChatStore } from "../stores/chat-store"
import { queueComposerAsset, takeComposerAssetDetails } from "./composer-assets"
import {
  formatContextChipsForSend,
  takeSessionContextChips
} from "./session-context-chips"
import { composerRunKind } from "./composer-run-kind"
import {
  abortOrphanedRun,
  claimComposerRun,
  dropEmptyPendingAssistant
} from "./composer-run-control"
import { applyOptimisticTitle, completeSessionTitle } from "./session-title"

export { abortComposerRun } from "./composer-run-control"

export async function sendComposerMessage() {
  const store = useChatStore.getState()
  if (store.running) return
  if (!(await guardComposer(store))) return

  const draft = store.composer.trim()
  const chipBlock = formatContextChipsForSend(takeSessionContextChips())
  const content = [chipBlock, draft].filter(Boolean).join("\n\n")
  if (!content) return

  const queuedAssets = takeComposerAssetDetails()
  const assetIds = queuedAssets.map((item) => item.id)
  const messageAssets = queuedAssets.map((item) => ({
    assetId: item.id,
    mediaType: resolveMediaType(item.name, item.mediaType),
    name: item.name,
    url: item.url
  }))

  const messages = store.appendUserMessage(
    content,
    messageAssets.length > 0 ? messageAssets : undefined
  )
  applyOptimisticTitle(content)
  const runKind = composerRunKind(store.modelId, currentCaps(store))
  store.setMessages([
    ...messages,
    {
      id: `msg_pending_${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      reasoning: "",
      tools: [],
      runKind
    }
  ])
  store.setRunning(true)
  const sessionId = store.sessionId

  try {
    const result = (await startComposerRun(store, content, messages, assetIds)) as { runId: string }
    if (!claimComposerRun(sessionId, result.runId)) {
      abortOrphanedRun(result.runId)
      return
    }
    if (composerRunKind(store.modelId, currentCaps(store)) === "agent") {
      void completeSessionTitle(content)
    }
  } catch (error) {
    dropEmptyPendingAssistant()
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

function currentCaps(store: ReturnType<typeof useChatStore.getState>) {
  return store.models.find((model) => model.id === store.modelId)?.capabilities
}

async function startComposerRun(
  store: ReturnType<typeof useChatStore.getState>,
  content: string,
  messages: ReturnType<typeof useChatStore.getState>["messages"],
  assetIds: string[]
) {
  const kind = composerRunKind(store.modelId, currentCaps(store))
  const history = messages.map((message) => ({
    role: message.role,
    content: message.content,
    reasoning: message.reasoning
  }))
  if (kind === "image" || kind === "video") {
    return getIde().ai.generate({
      kind,
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? undefined,
      modelId: store.modelId,
      prompt: content,
      messages: history,
      attachments: assetIds
    })
  }
  return getIde().agent.run({
    sessionId: store.sessionId,
    workspaceId: store.workspaceId,
    modelId: store.modelId,
    mode: store.mode,
    reasoningEffort: store.reasoningEffort,
    messages: history,
    attachments: assetIds
  })
}

async function guardComposer(store: ReturnType<typeof useChatStore.getState>): Promise<boolean> {
  if (!hasIde()) {
    store.setError("The desktop IPC bridge is not available.")
    return false
  }
  if (!store.workspaceId || !store.sessionId) {
    store.setError("Open a workspace folder before running an agent.")
    return false
  }
  if (store.hasKey) return true
  void import("../router").then(({ router }) => {
    void router.navigate({ to: "/settings/$section", params: { section: "providers" } })
  })
  store.setError("Add a provider API key in Settings before running an agent.")
  return false
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
  const fileArray = Array.from(files)
  for (const file of fileArray) {
    await attachComposerFile(file)
  }
}

