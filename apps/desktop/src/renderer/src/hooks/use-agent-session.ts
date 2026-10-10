import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  StreamEvent,
  readWorkspaceChangesResult,
  type AskUserAnswers,
  type SettingsSnapshot
} from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { rememberOpenedWorkspace } from "./remember-opened-workspace"
import { useBootWorkspace } from "./use-boot-workspace"
import { rememberDefaultMode } from "../components/ai-chat/composer/composer-mode"
import { applyDefaultChatRoute } from "./apply-default-chat-route"
import { peekChatReadiness } from "./chat-readiness-cache"
import { pickSessionRuntime } from "../lib/agent-runtime"
import { abortComposerRun } from "./composer-run-control"
import { composerModelPatch } from "../lib/session-model.ts"
import { pickActiveModel } from "./pick-active-model"
import {
  createAndOpenSession,
  loadSession,
  refreshAllWorkspaces,
  selectPersistedSession
} from "./session-lifecycle"
import { connectSshIfNeeded, disconnectPreviousSsh } from "./ssh-session-switch"
import type { WorkspaceRow } from "./workspace-row"
import { dispatchAgentEvent } from "../stores/attention/dispatch-agent-event"
import { useChatStore, type ModelOption } from "../stores/chat-store"
import { pickForegroundSession } from "./pick-foreground-session"
import { resolveApprovalRunId } from "./resolve-approval-run"
import { shouldFollowFileChanged } from "../components/ai-chat/right-pane/follow-review-file"
import { revealRightPane } from "../components/ai-chat/right-pane/open-pane"
import { sameReviewPath } from "../components/ai-chat/right-pane/views/review/same-review-path"
import { useRightPaneStore } from "../stores/right-pane-store"
import { useWorkspaceChangeInvalidation } from "./use-workspace-change-invalidation"
import { useChatReadiness } from "./use-chat-readiness"
import { useSessionFocus } from "./use-session-focus"
import { planNewSession } from "./plan-new-session"
import { rememberWorkspaceOnLoad } from "./unknown-workspace-remember"
import { landEmptyHome } from "./nav-history/nav-history-controller"
import { useNoProjectNudge } from "../components/app-shell/chat/no-project-nudge"

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
    const offRemote = getIde().workspace.onRemote?.((event) => {
      const store = useChatStore.getState()
      if (event.workspaceId !== store.workspaceId) return
      store.setRemoteStatus(event.status as typeof store.remoteStatus, event.label, event.error)
    })
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
      if (parsed.data.type === "file.changed") followOpenReviewFile(parsed.data.path)
    })
    return () => {
      unsubscribe()
      offRemote?.()
    }
  }, [queryClient])

  useEffect(() => {
    const snapshot = settingsQuery.data
    if (!snapshot) return
    void applySettingsSnapshot(snapshot)
  }, [settingsQuery.data])

  useChatReadiness()
  useSessionFocus()

  useBootWorkspace(
    Boolean(settingsQuery.data),
    settingsQuery.data?.lastWorkspaceId,
    settingsQuery.data?.recentWorkspaceIds,
    workspacesQuery.data,
    (workspace) => {
      void loadWorkspace(workspace)
    }
  )

  const workspaceId = useChatStore((state) => state.workspaceId)
  useWorkspaceChangeInvalidation(workspaceId)

  const changesQuery = useQuery({
    queryKey: ["changes", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: async () => {
      const parsed = readWorkspaceChangesResult(
        await getIde().workspace.changes({ workspaceId: workspaceId as string })
      )
      useChatStore.getState().setChanges(parsed.files, parsed.gitRepo ?? null)
      return parsed.files
    }
  })

  return {
    isBooting: settingsQuery.isLoading || workspacesQuery.isLoading,
    changes: changesQuery.data ?? []
  }
}

export async function loadWorkspace(workspace: WorkspaceRow) {
  rememberOpenedWorkspace(workspace)
  if (hasIde()) {
    const outcome = await rememberWorkspaceOnLoad({
      remember: () => getIde().workspace.remember({ workspaceId: workspace.id }),
      onUnknown: async () => {
        await refreshAllWorkspaces()
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      }
    })
    if (outcome === "abort") return
  }
  const store = useChatStore.getState()
  await disconnectPreviousSsh(store.workspaceId, store.workspaceKind, workspace.id)
  store.setWorkspace(workspace)
  await connectSshIfNeeded(workspace)
  await refreshAllWorkspaces()
  await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  const sessions = (await getIde().session.list({ workspaceId: workspace.id })) as Array<{
    id: string
    title: string
  }>
  const currentId = useChatStore.getState().sessionId
  const picked = pickForegroundSession(sessions, currentId)
  if (picked === "keep") return
  if (picked === "create") {
    await createAndOpenSession(workspace.id, "新对话")
    return
  }
  await loadSession(picked.id, picked.title)
}

export { abortComposerRun }
export { attachComposerFile, sendComposerMessage, submitComposer } from "./send-composer"
export { createAndOpenSession, loadSession, refreshAllWorkspaces, selectPersistedSession }
export type { WorkspaceRow } from "./workspace-row"

export async function decidePendingApproval(
  decision: "allow" | "deny" | "allow_session" | "allow_always",
  answers?: AskUserAnswers
) {
  const store = useChatStore.getState()
  const pending = store.pendingApproval
  const runId = resolveApprovalRunId(pending, store.runId)
  if (!pending || !runId) {
    store.setError("没有等待中的审批。")
    return
  }
  try {
    await getIde().agent.decide({
      runId,
      toolCallId: pending.toolCallId,
      approvalId: pending.approvalId,
      decision,
      ...(answers ? { answers } : {})
    })
  } catch (error) {
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

export async function applySettingsSnapshot(snapshot: SettingsSnapshot) {
  const store = useChatStore.getState()
  const profileName = snapshot.preferences.accountProfile?.name?.trim()
  if (profileName) useChatStore.setState({ userName: profileName })
  store.setProvider(snapshot.provider)
  rememberDefaultMode(snapshot.preferences?.defaultMode)
  // 会话 mode 由 Composer / 句首斜杠决定。默认项只在设置页写入，refetch 不得打回 agent。
  const readySnap = peekChatReadiness()
  if (readySnap?.defaultRoute) applyDefaultChatRoute(readySnap)
  const after = useChatStore.getState()
  const preferred =
    after.preferredRuntimeId ||
    readySnap?.defaultRoute?.runtimeId ||
    snapshot.preferences?.runtimeId ||
    "enjoy-local"
  store.setPreferredRuntimeId(preferred)
  store.setSessionRuntimes(snapshot.sessionRuntimes ?? {})
  store.setSessionModels(snapshot.sessionModels ?? {})
  store.setRuntimeId(
    pickSessionRuntime(store.sessionId, snapshot.sessionRuntimes, after.runtimeId || preferred)
  )
  if (!store.preferredModelId && snapshot.defaultModelId) {
    store.setPreferredModelId(snapshot.defaultModelId)
  }
  if (!hasIde()) {
    store.setHasKey(snapshot.hasKey)
    return
  }
  const models = (await getIde().models.list()) as ModelOption[]
  store.setModels(models)
  const preferredModel = store.preferredModelId || snapshot.defaultModelId
  const sessionPatch = store.sessionId
    ? composerModelPatch({
        sessionId: store.sessionId,
        sessionModels: snapshot.sessionModels ?? store.sessionModels,
        preferredModelId: preferredModel,
        models
      })
    : { modelId: preferredModel, modelLabel: "" }
  const selected = pickActiveModel(models, sessionPatch.modelId, snapshot.defaultModelId)
  if (selected) {
    store.setModel(
      selected.id,
      selected.label,
      selected.provider,
      store.reasoningEffort ?? selected.reasoningEffort
    )
  } else {
    store.setModel(sessionPatch.modelId, sessionPatch.modelLabel)
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
  if (planNewSession(workspaceId) === "empty_home") {
    useNoProjectNudge.getState().pulse()
    await landEmptyHome()
    return
  }
  await createAndOpenSession(workspaceId as string, "新对话")
}

export async function openChangedFile(path: string, opts?: { reveal?: boolean }) {
  const store = useChatStore.getState()
  if (!store.workspaceId || !path) return

  const matched = store.changes.find((c) => sameReviewPath(c.path, path))
  let resolvedPath = matched?.path ?? path

  if (opts?.reveal !== false) revealRightPane("review")
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

function followOpenReviewFile(path: string) {
  const chat = useChatStore.getState()
  const pane = useRightPaneStore.getState()
  const tab = pane.tabs.find((item) => item.id === pane.activeId)
  if (
    !shouldFollowFileChanged({
      collapsed: chat.rightPanelCollapsed,
      activeTabKind: tab?.kind,
      reviewScope: pane.reviewScope
    })
  ) {
    return
  }
  void openChangedFile(path, { reveal: false })
}

async function tryReadFile(workspaceId: string, path: string): Promise<string | null> {
  try {
    const res = (await getIde().workspace.readFile({ workspaceId, path })) as string
    return typeof res === "string" ? res : null
  } catch {
    return null
  }
}
