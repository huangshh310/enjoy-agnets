/**
 * Composer 发送：校验会话后把历史（含思考）交给主进程跑 Agent。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { takeComposerAssets } from "./composer-assets"
import { applyOptimisticTitle, completeSessionTitle } from "./session-title"

export async function sendComposerMessage() {
  const store = useChatStore.getState()
  const content = store.composer.trim()
  if (!content || store.running) return
  if (!guardComposer(store)) return

  const messages = store.appendUserMessage(content)
  applyOptimisticTitle(content)
  store.setMessages([
    ...messages,
    {
      id: `msg_pending_${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      reasoning: "",
      tools: []
    }
  ])
  store.setRunning(true)

  try {
    const result = (await getIde().agent.run({
      sessionId: store.sessionId,
      workspaceId: store.workspaceId,
      modelId: store.modelId,
      mode: store.mode,
      reasoningEffort: store.reasoningEffort,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        reasoning: message.reasoning
      })),
      attachments: takeComposerAssets()
    })) as { runId: string }
    store.setRunning(true, result.runId)
    void completeSessionTitle(content)
  } catch (error) {
    dropEmptyPendingAssistant()
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error))
  }
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
  await getIde().agent.abort(store.runId)
  store.setRunning(false)
}

export async function attachComposerFile(file: File) {
  if (!hasIde()) return
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const asset = (await getIde().assets.import({
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    bytesBase64: btoa(binary)
  })) as { id: string }
  const { queueComposerAsset } = await import("./composer-assets")
  queueComposerAsset(asset.id, file.name)
}

function dropEmptyPendingAssistant() {
  const store = useChatStore.getState()
  const last = store.messages.at(-1)
  if (last?.role === "assistant" && last.streaming && !last.content && !last.tools?.length) {
    store.setMessages(store.messages.slice(0, -1))
  }
}
