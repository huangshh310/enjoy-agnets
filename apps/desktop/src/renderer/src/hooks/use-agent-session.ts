import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  parseAssistantPayload,
  sealAbandonedTools,
  StreamEvent,
  type SettingsSnapshot
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import {
  useChatStore,
  type ChangedFileRow,
  type ModelOption,
  type ThreadMessage
} from "../stores/chat-store"

type WorkspaceRow = { id: string; name: string; rootPath: string }
type SessionRow = { id: string; workspaceId: string; title: string; updatedAt: number }
type MessageRow = { id: string; role: "user" | "assistant"; content: string; createdAt: number }

export function useAgentSession() {
  const queryClient = useQueryClient()
  const applyStreamEvent = useChatStore((state) => state.applyStreamEvent)

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })

  useEffect(() => {
    if (!hasIde()) return
    const unsubscribe = getIde().agent.onEvent((raw) => {
      const parsed = StreamEvent.safeParse(raw)
      if (!parsed.success) return
      applyStreamEvent(parsed.data)
      if (parsed.data.type === "run.end" || parsed.data.type === "tool.result") {
        const workspaceId = useChatStore.getState().workspaceId
        if (workspaceId) {
          void queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
        }
      }
    })
    return () => {
      unsubscribe()
    }
  }, [applyStreamEvent, queryClient])

  useEffect(() => {
    const snapshot = settingsQuery.data
    if (!snapshot) return
    void applySettingsSnapshot(snapshot)
  }, [settingsQuery.data])

  useEffect(() => {
    const workspaces = workspacesQuery.data
    const snapshot = settingsQuery.data
    if (!workspaces || !snapshot) return
    if (workspaces.length === 0) {
      useChatStore.getState().setWorkspace(null)
      return
    }
    const selected =
      workspaces.find((workspace) => workspace.id === snapshot.lastWorkspaceId) ?? workspaces[0]
    if (selected && useChatStore.getState().workspaceId !== selected.id) {
      void loadWorkspace(selected)
    }
  }, [workspacesQuery.data, settingsQuery.data])

  const workspaceId = useChatStore((state) => state.workspaceId)

  const changesQuery = useQuery({
    queryKey: ["changes", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: async () => {
      const rows = (await getIde().workspace.changes(workspaceId as string)) as ChangedFileRow[]
      useChatStore.getState().setChanges(rows)
      return rows
    }
  })

  return {
    isBooting: settingsQuery.isLoading || workspacesQuery.isLoading,
    changes: changesQuery.data ?? []
  }
}

export async function loadWorkspace(workspace: WorkspaceRow) {
  const store = useChatStore.getState()
  store.setWorkspace(workspace)
  const sessions = (await getIde().session.list(workspace.id)) as SessionRow[]
  store.hydrateSessions(workspace, sessions)
  const current = sessions.find((session) => session.id === store.sessionId) ?? sessions[0]
  if (current) {
    await loadSession(current.id, current.title)
    return
  }
  await createAndOpenSession(workspace.id)
}

export async function loadSession(sessionId: string, title: string) {
  const store = useChatStore.getState()
  store.setSession(sessionId, title)
  const rows = (await getIde().session.messages(sessionId)) as MessageRow[]
  const messages: ThreadMessage[] = rows.map((row) => {
    if (row.role !== "assistant") {
      return {
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: row.createdAt
      }
    }
    const payload = parseAssistantPayload(row.content)
    return {
      id: row.id,
      role: row.role,
      content: payload.content,
      reasoning: payload.reasoning,
      tools: sealAbandonedTools(payload.tools),
      thoughtSeconds: payload.thoughtSeconds,
      createdAt: row.createdAt
    }
  })
  store.setMessages(messages)
}

export async function createAndOpenSession(workspaceId: string) {
  const session = (await getIde().session.create(workspaceId, "New agent")) as SessionRow
  const workspace = useChatStore.getState()
  const sessions = (await getIde().session.list(workspaceId)) as SessionRow[]
  workspace.hydrateSessions(
    { id: workspaceId, name: workspace.workspaceName },
    sessions
  )
  workspace.setSession(session.id, session.title)
  workspace.setMessages([])
}

export { sendComposerMessage } from "./send-composer"

export async function decidePendingApproval(decision: "allow" | "deny" | "allow_session") {
  const store = useChatStore.getState()
  const pending = store.pendingApproval
  const runId = store.runId
  if (!pending || !runId) return
  await getIde().agent.decide({
    runId,
    toolCallId: pending.toolCallId,
    approvalId: pending.approvalId,
    decision
  })
}

export async function saveApiKey() {
  const store = useChatStore.getState()
  if (!store.apiKeyDraft.trim()) return
  const snapshot = (await getIde().settings.saveSecret({
    provider: store.providerDraft,
    apiKey: store.apiKeyDraft.trim()
  })) as SettingsSnapshot
  store.setApiKeyDraft("")
  store.setError(null)
  await applySettingsSnapshot(snapshot)
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot) {
  const store = useChatStore.getState()
  store.setHasKey(snapshot.hasKey)
  store.setProvider(snapshot.provider)
  if (snapshot.provider) store.setProviderDraft(snapshot.provider)
  if (snapshot.preferences?.defaultMode) store.setMode(snapshot.preferences.defaultMode)
  if (!hasIde()) return
  const models = (await getIde().models.list()) as ModelOption[]
  store.setModels(models)
  const currentModelId = store.modelId
  const foundCurrent = models.find((m) => m.id === currentModelId)
  if (foundCurrent) {
    store.setModel(
      foundCurrent.id,
      foundCurrent.label,
      foundCurrent.provider,
      store.reasoningEffort ?? foundCurrent.reasoningEffort
    )
  } else {
    const selected = models.find((model) => model.id === snapshot.defaultModelId) ?? models[0]
    if (selected) {
      store.setModel(
        selected.id,
        selected.label,
        selected.provider,
        store.reasoningEffort ?? selected.reasoningEffort
      )
    }
  }
}

export async function openFolder() {
  try {
    const workspace = (await getIde().workspace.open({})) as WorkspaceRow
    await loadWorkspace(workspace)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("No workspace folder selected")) return
    useChatStore.getState().setError(message)
  }
}

export async function startPersistedSession() {
  const workspaceId = useChatStore.getState().workspaceId
  if (!workspaceId) {
    await openFolder()
    return
  }
  await createAndOpenSession(workspaceId)
}

export async function selectPersistedSession(sessionId: string) {
  const node = useChatStore.getState().repositories.find((item) => item.id === sessionId)
  if (!node || node.kind !== "session") return
  await loadSession(node.id, node.name)
}

export async function openChangedFile(path: string) {
  const store = useChatStore.getState()
  if (!store.workspaceId) return
  const content = (await getIde().workspace.readFile({
    workspaceId: store.workspaceId,
    path
  })) as string
  store.setSelectedFile(path, content)
}
