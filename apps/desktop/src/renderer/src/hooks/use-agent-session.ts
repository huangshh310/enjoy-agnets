import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  migrateContentToParts,
  safeValidateUIMessages,
  StreamEvent,
  type SettingsSnapshot
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { pickSessionRuntime } from "../lib/agent-runtime"
import { abortComposerRun } from "./composer-run-control"
import { pickActiveModel } from "./pick-active-model"
import { threadFromRows } from "./hydrate-thread"
import { mergeUserAssets } from "./merge-user-assets"
import {
  useChatStore,
  type ChangedFileRow,
  type ModelOption
} from "../stores/chat-store"
import { revealRightPane } from "../components/ai-chat/right-pane/open-pane"

export type WorkspaceRow = { id: string; name: string; rootPath: string }
type SessionRow = { id: string; workspaceId: string; title: string; updatedAt: number }
type MessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  parts?: unknown[]
}

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
      const rows = (await getIde().workspace.changes({ workspaceId: workspaceId as string })) as ChangedFileRow[]
      useChatStore.getState().setChanges(rows)
      return rows
    }
  })

  return {
    isBooting: settingsQuery.isLoading || workspacesQuery.isLoading,
    changes: changesQuery.data ?? []
  }
}

export async function refreshAllWorkspaces() {
  if (!hasIde()) return
  try {
    const workspaces = (await getIde().workspace.list()) as WorkspaceRow[]
    const activeWorkspaceId = useChatStore.getState().workspaceId
    const items = await Promise.all(
      workspaces.map(async (ws) => {
        try {
          const sessions = (await getIde().session.list({ workspaceId: ws.id })) as SessionRow[]
          return {
            workspace: { id: ws.id, name: ws.name, rootPath: ws.rootPath },
            sessions: sessions.map((s) => ({
              id: s.id,
              title: s.title,
              updatedAt: s.updatedAt,
              workspaceId: s.workspaceId
            }))
          }
        } catch {
          return {
            workspace: { id: ws.id, name: ws.name, rootPath: ws.rootPath },
            sessions: []
          }
        }
      })
    )
    useChatStore.getState().hydrateWorkspacesAndSessions(items, activeWorkspaceId)
  } catch {
    // ignore refresh errors
  }
}

export async function loadWorkspace(workspace: WorkspaceRow) {
  const store = useChatStore.getState()
  store.setWorkspace(workspace)
  await refreshAllWorkspaces()
  const sessions = (await getIde().session.list({ workspaceId: workspace.id })) as SessionRow[]
  const current = sessions.find((session) => session.id === store.sessionId) ?? sessions[0]
  if (current) {
    await loadSession(current.id, current.title)
    return
  }
  await createAndOpenSession(workspace.id)
}

export async function loadSession(sessionId: string, title: string) {
  const store = useChatStore.getState()
  const previous = store.sessionId === sessionId ? store.messages : []
  if (store.sessionId !== sessionId) {
    await abortComposerRun()
    store.setError(null)
  }
  store.setSession(sessionId, title)
  store.setRuntimeId(pickSessionRuntime(sessionId, store.sessionRuntimes, store.preferredRuntimeId))
  const rows = (await getIde().session.messages({ sessionId })) as MessageRow[]
  restoreUiMessages(rows)
  store.setMessages(mergeUserAssets(threadFromRows(rows), previous))
}

function restoreUiMessages(rows: MessageRow[]) {
  safeValidateUIMessages(
    rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: row.parts && row.parts.length > 0 ? row.parts : migrateContentToParts(row.content),
      createdAt: row.createdAt
    }))
  )
}

export async function createAndOpenSession(workspaceId: string, customTitle = "New agent") {
  await abortComposerRun()
  const session = (await getIde().session.create({
    workspaceId,
    title: customTitle
  })) as SessionRow
  const store = useChatStore.getState()
  store.setError(null)
  store.setSession(session.id, session.title)
  store.setRuntimeId(store.preferredRuntimeId)
  store.setMessages([])
  await refreshAllWorkspaces()
}

export { abortComposerRun }
export { attachComposerFile, sendComposerMessage } from "./send-composer"

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

export async function applySettingsSnapshot(snapshot: SettingsSnapshot) {
  const store = useChatStore.getState()
  store.setHasKey(snapshot.hasKey)
  store.setProvider(snapshot.provider)
  const preferred = snapshot.preferences?.runtimeId ?? "enjoy-local"
  store.setPreferredRuntimeId(preferred)
  store.setSessionRuntimes(snapshot.sessionRuntimes ?? {})
  store.setRuntimeId(pickSessionRuntime(store.sessionId, snapshot.sessionRuntimes, preferred))
  if (snapshot.preferences?.defaultMode) store.setMode(snapshot.preferences.defaultMode)
  if (!hasIde()) return
  const models = (await getIde().models.list()) as ModelOption[]
  store.setModels(models)
  const selected = pickActiveModel(models, store.modelId, snapshot.defaultModelId)
  if (selected) {
    store.setModel(
      selected.id,
      selected.label,
      selected.provider,
      store.reasoningEffort ?? selected.reasoningEffort
    )
    return
  }
  store.setModel("", "")
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
  revealRightPane("review")
  const content = (await getIde().workspace.readFile({
    workspaceId: store.workspaceId,
    path
  })) as string
  store.setSelectedFile(path, content)
}
