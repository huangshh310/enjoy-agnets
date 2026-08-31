/**
 * Composer 发送：imagine / 生图模型走 ai.generate + generateImage，其余走 Agent。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { queueComposerAsset, takeComposerAssetDetails } from "./composer-assets"
import { composerRunKind } from "./composer-run-kind"
import { applyOptimisticTitle, completeSessionTitle } from "./session-title"

export async function sendComposerMessage() {
  const store = useChatStore.getState()
  const content = store.composer.trim()
  if (!content || store.running) return
  if (!guardComposer(store)) return

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

  try {
    const result = (await startComposerRun(store, content, messages, assetIds)) as { runId: string }
    store.setRunning(true, result.runId)
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

function guardComposer(store: ReturnType<typeof useChatStore.getState>): boolean {
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

export async function abortComposerRun() {
  const store = useChatStore.getState()
  if (!store.runId || !hasIde()) return
  await getIde().ai.abort(store.runId)
  store.setRunning(false)
}

export async function attachComposerFile(file: File) {
  if (!hasIde()) return
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const previewUrl = URL.createObjectURL(file)
  try {
    const mediaType = resolveMediaType(file.name, file.type)
    const asset = (await getIde().assets.import({
      name: file.name,
      mediaType,
      bytesBase64: btoa(binary)
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

function dropEmptyPendingAssistant() {
  const store = useChatStore.getState()
  const last = store.messages.at(-1)
  if (last?.role === "assistant" && last.streaming && !last.content && !last.tools?.length) {
    store.setMessages(store.messages.slice(0, -1))
  }
}
