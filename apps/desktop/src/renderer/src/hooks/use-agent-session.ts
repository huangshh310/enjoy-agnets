import { useEffect } from "react"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { DEMO_BUTTON_FILE } from "../data/demo-thread"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"

export function useAgentSession() {
  const applyStreamEvent = useChatStore((state) => state.applyStreamEvent)
  const setHasKey = useChatStore((state) => state.setHasKey)
  const setSelectedFile = useChatStore((state) => state.setSelectedFile)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)

  useEffect(() => {
    if (!selectedFileContent) {
      setSelectedFile(selectedFilePath, DEMO_BUTTON_FILE)
    }
  }, [selectedFileContent, selectedFilePath, setSelectedFile])

  useEffect(() => {
    if (!hasIde()) return
    const ide = getIde()
    void ide.settings.get().then((snapshot: { hasKey: boolean }) => {
      setHasKey(snapshot.hasKey)
    })
    const unsubscribe = ide.agent.onEvent((raw) => {
      applyStreamEvent(raw as StreamEvent)
    })
    return () => {
      unsubscribe()
    }
  }, [applyStreamEvent, setHasKey])
}

export async function sendComposerMessage() {
  const store = useChatStore.getState()
  const content = store.composer.trim()
  if (!content || store.running) return

  if (!hasIde()) {
    store.setError("The desktop IPC bridge is not available.")
    return
  }

  if (!store.hasKey) {
    store.setSettingsOpen("keys")
    store.setError("Add a provider API key in Settings before running an agent.")
    return
  }

  const messages = store.appendUserMessage(content)
  store.setRunning(true)

  try {
    const result = (await getIde().agent.run({
      sessionId: store.sessionId,
      workspaceId: store.workspaceId ?? "ws_local",
      modelId: store.modelId,
      mode: store.mode,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    })) as { runId: string }
    store.setRunning(true, result.runId)
  } catch (error) {
    store.setRunning(false)
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

export async function saveApiKey() {
  const store = useChatStore.getState()
  if (!store.apiKeyDraft.trim()) return
  await getIde().settings.saveSecret({
    provider: store.providerDraft,
    apiKey: store.apiKeyDraft.trim()
  })
  store.setHasKey(true)
  store.setApiKeyDraft("")
  store.setSettingsOpen(false)
  store.setError(null)
}

export async function openFolder() {
  const workspace = (await getIde().workspace.open({})) as {
    id: string
    name: string
    rootPath: string
  }
  useChatStore.getState().setWorkspace(workspace)
  const session = (await getIde().session.create(workspace.id, "New agent")) as {
    id: string
    title: string
  }
  useChatStore.getState().selectSession(session.id)
}
