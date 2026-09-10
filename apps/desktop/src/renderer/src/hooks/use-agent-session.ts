import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { StreamEvent, type AskUserAnswers, type SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { rememberDefaultMode } from "../components/ai-chat/composer/composer-mode"
import { pickSessionRuntime } from "../lib/agent-runtime"
import { abortComposerRun } from "./composer-run-control"
import { pickActiveModel } from "./pick-active-model"
import {
  createAndOpenSession,
  loadSession,
  refreshAllWorkspaces,
  selectPersistedSession,
  type WorkspaceRow
} from "./session-lifecycle"
import { dispatchAgentEvent } from "../stores/attention/dispatch-agent-event"
import {
  useChatStore,
  type ChangedFileRow,
  type ModelOption
} from "../stores/chat-store"
import { revealRightPane } from "../components/ai-chat/right-pane/open-pane"
import { sameReviewPath } from "../components/ai-chat/right-pane/views/review/same-review-path"

export function useAgentSession() {
  const queryClient = useQueryClient()

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
      dispatchAgentEvent(parsed.data)
      if (
        parsed.data.type === "run.end" ||
        parsed.data.type === "tool.result" ||
        parsed.data.type === "file.changed"
      ) {
        const workspaceId = useChatStore.getState().workspaceId
        if (workspaceId) {
          void queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
          void queryClient.invalidateQueries({ queryKey: ["checkpoints", workspaceId] })
        }
      }
    })
    return () => {
      unsubscribe()
    }
  }, [queryClient])

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

export async function loadWorkspace(workspace: WorkspaceRow) {
  const store = useChatStore.getState()
  store.setWorkspace(workspace)
  await refreshAllWorkspaces()
  const sessions = (await getIde().session.list({ workspaceId: workspace.id })) as Array<{
    id: string
    title: string
  }>
  const current = sessions.find((session) => session.id === store.sessionId) ?? sessions[0]
  if (current) {
    await loadSession(current.id, current.title)
    return
  }
  await createAndOpenSession(workspace.id)
}

export { abortComposerRun }
export { attachComposerFile, sendComposerMessage, submitComposer } from "./send-composer"
export { createAndOpenSession, loadSession, refreshAllWorkspaces, selectPersistedSession }
export type { WorkspaceRow } from "./session-lifecycle"

export async function decidePendingApproval(
  decision: "allow" | "deny" | "allow_session",
  answers?: AskUserAnswers
) {
  const store = useChatStore.getState()
  const pending = store.pendingApproval
  const runId = store.runId
  if (!pending || !runId) return
  await getIde().agent.decide({
    runId,
    toolCallId: pending.toolCallId,
    approvalId: pending.approvalId,
    decision,
    ...(answers ? { answers } : {})
  })
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot) {
  const store = useChatStore.getState()
  const profileName = snapshot.preferences.accountProfile?.name?.trim()
  if (profileName) useChatStore.setState({ userName: profileName })
  store.setProvider(snapshot.provider)
  rememberDefaultMode(snapshot.preferences?.defaultMode)
  // 会话 mode 由 Composer / 句首斜杠决定。默认项只在设置页写入，refetch 不得打回 agent。
  const preferred = snapshot.preferences?.runtimeId ?? "enjoy-local"
  store.setPreferredRuntimeId(preferred)
  store.setSessionRuntimes(snapshot.sessionRuntimes ?? {})
  store.setRuntimeId(pickSessionRuntime(store.sessionId, snapshot.sessionRuntimes, preferred))
  if (!hasIde()) {
    store.setHasKey(snapshot.hasKey)
    return
  }
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
  } else {
    store.setModel("", "")
  }
  // 先写 model 再亮 hasKey，避免发送盘在 modelId 仍空时变成 Send。
  store.setHasKey(snapshot.hasKey)
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

export async function openChangedFile(path: string) {
  const store = useChatStore.getState()
  if (!store.workspaceId || !path) return

  const matched = store.changes.find((c) => sameReviewPath(c.path, path))
  let resolvedPath = matched?.path ?? path

  revealRightPane("review")
  store.setSelectedFile(resolvedPath, store.selectedFileContent || "")

  try {
    const direct = await tryReadFile(store.workspaceId, resolvedPath)
    if (direct != null) {
      if (useChatStore.getState().selectedFilePath === resolvedPath) {
        store.setSelectedFile(resolvedPath, direct)
      }
      return
    }

    if (!path.includes("/") && !path.includes("\\")) {
      const candidates = [
        `src/components/chrome/${path}`,
        `src/components/${path}`,
        `src/app/${path}`,
        `src/${path}`,
        `components/${path}`,
        `lib/${path}`,
        `public/${path}`
      ]
      for (const candidate of candidates) {
        const found = await tryReadFile(store.workspaceId, candidate)
        if (found != null) {
          resolvedPath = candidate
          if (
            useChatStore.getState().selectedFilePath === path ||
            useChatStore.getState().selectedFilePath === resolvedPath
          ) {
            store.setSelectedFile(resolvedPath, found)
          }
          return
        }
      }
    }
  } catch {
    // 若读取失败，保留选中的文件路径使 Diff/视图依然能响应
  }
}

async function tryReadFile(workspaceId: string, path: string): Promise<string | null> {
  try {
    const res = (await getIde().workspace.readFile({ workspaceId, path })) as string
    return typeof res === "string" ? res : null
  } catch {
    return null
  }
}
