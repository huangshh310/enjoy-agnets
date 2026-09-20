/**
 * 打开 / 新建会话：停车当前 run，不 abort 后台轮。
 */
import { AgentToolId, migrateContentToParts, safeValidateUIMessages, type SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import {
  modeForLoadedSession,
  modeForNewSession,
  readRememberedDefaultMode
} from "../components/ai-chat/composer/composer-mode"
import { pickSessionRuntime } from "../lib/agent-runtime"
import { DEFAULT_RUNTIME_ID } from "../lib/session-runtime"
import { getIde, hasIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import {
  captureParkedRun,
  idleComposerPatch,
  parkedComposerPatch
} from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"
import { threadFromRows } from "./hydrate-thread"
import { mergeUserAssets } from "./merge-user-assets"
import { composerModelPatch } from "../lib/session-model.ts"
import { bindSessionRuntime } from "./persist-runtime"
import { useEngineHandoffStore } from "../components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { connectSshIfNeeded, disconnectPreviousSsh } from "./ssh-session-switch"
import { clearComposerAssets, listComposerAssets, setComposerAssets } from "./composer-assets"
import { listQuotedContexts, setQuotedContexts } from "./quoted-context"
import type { WorkspaceRow } from "./workspace-row"

export type { WorkspaceRow } from "./workspace-row"
type SessionRow = {
  id: string
  workspaceId: string
  title: string
  updatedAt: number
  flagged?: boolean
  workflowStatus?: SessionWorkflowStatus | null
  goal?: string | null
  recap?: string | null
}
type MessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  parts?: unknown[]
}

export function saveCurrentSessionDraft() {
  const store = useChatStore.getState()
  const sid = store.sessionId
  if (!sid) return
  const text = store.composer
  const assets = listComposerAssets()
  const quotedContexts = listQuotedContexts()
  if (text || assets.length > 0 || quotedContexts.length > 0) {
    store.saveSessionDraft(sid, { text, assets, quotedContexts })
  } else {
    store.clearSessionDraft(sid)
  }
}

export async function loadSession(sessionId: string, title: string) {
  const store = useChatStore.getState()
  const sameSession = store.sessionId === sessionId
  const previous = sameSession ? store.messages : []
  if (!sameSession) {
    if (store.sessionId) {
      parkForegroundRun()
      saveCurrentSessionDraft()
    }
    store.setSession(sessionId, title)
    store.setRuntimeId(pickSessionRuntime(sessionId, store.sessionRuntimes, store.preferredRuntimeId))
    applyComposerModel(store, sessionId)
    useChatStore.setState({ mode: modeForLoadedSession(store.sessionModes[sessionId]) })
    useEngineHandoffStore.getState().resetPending()
    restoreComposerForSession(sessionId)
  } else {
    store.setSession(sessionId, title)
  }
  const rows = (await getIde().session.messages({ sessionId })) as MessageRow[]
  restoreUiMessages(rows)
  store.setMessages(mergeUserAssets(threadFromRows(rows), previous))
}

export async function createAndOpenSession(workspaceId: string, customTitle = "新对话") {
  parkForegroundRun()
  saveCurrentSessionDraft()
  const session = (await getIde().session.create({
    workspaceId,
    title: customTitle
  })) as SessionRow
  const store = useChatStore.getState()
  const runtimeId = resolveCreateRuntime(store.runtimeId, store.preferredRuntimeId)
  useChatStore.setState({ ...idleComposerPatch(), composer: "" })
  clearComposerAssets()
  setQuotedContexts([])
  useEngineHandoffStore.getState().resetPending()
  store.setSession(session.id, session.title)
  store.setRuntimeId(runtimeId)
  store.setMessages([])
  store.setMode(modeForNewSession(readRememberedDefaultMode()))
  applyComposerModel(store, session.id)
  await bindSessionRuntime(session.id, runtimeId)
  await refreshAllWorkspaces()
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
            workspace: {
              id: ws.id,
              name: ws.name,
              rootPath: ws.rootPath,
              kind: ws.kind,
              sshStatus: ws.sshStatus,
              sshHost: ws.sshHost,
              sshUser: ws.sshUser,
              remotePath: ws.remotePath
            },
            sessions: sessions.map((s) => ({
              id: s.id,
              title: s.title,
              updatedAt: s.updatedAt,
              workspaceId: s.workspaceId
            }))
          }
        } catch {
          return {
            workspace: {
              id: ws.id,
              name: ws.name,
              rootPath: ws.rootPath,
              kind: ws.kind,
              sshStatus: ws.sshStatus,
              sshHost: ws.sshHost,
              sshUser: ws.sshUser,
              remotePath: ws.remotePath
            },
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

export async function selectPersistedSession(sessionId: string, workspaceId?: string) {
  const store = useChatStore.getState()
  const node = store.repositories.find((item) => item.id === sessionId)
  if (!node || node.kind !== "session") return
  const targetWorkspaceId = workspaceId ?? node.workspaceId ?? node.parentId
  if (targetWorkspaceId && store.workspaceId !== targetWorkspaceId) {
    const workspace = store.repositories.find(
      (item) => item.id === targetWorkspaceId && item.kind === "workspace"
    )
    if (workspace) {
      const row: WorkspaceRow = {
        id: workspace.id,
        name: workspace.name,
        rootPath: workspace.rootPath || "",
        kind: workspace.locationKind,
        sshStatus: workspace.sshStatus,
        sshHost: workspace.sshHost,
        sshUser: workspace.sshUser,
        remotePath: workspace.remotePath
      }
      await disconnectPreviousSsh(store.workspaceId, store.workspaceKind, row.id)
      store.setWorkspace(row)
      await connectSshIfNeeded(row)
    }
  }
  await loadSession(node.id, node.name)
}

export function parkForegroundRun() {
  const snapped = captureParkedRun(useChatStore.getState())
  if (snapped) useAttentionStore.getState().putPark(snapped)
}

export function restoreComposerForSession(sessionId: string) {
  const park = useAttentionStore.getState().takePark(sessionId)
  if (park) {
    useChatStore.setState(parkedComposerPatch(park))
  } else {
    const slot = useAttentionStore
      .getState()
      .items.find(
        (item) =>
          item.sessionId === sessionId &&
          (item.status === "active" || item.status === "focused") &&
          (item.kind === "pending_approval" || item.kind === "ask_user") &&
          item.approval
      )
    if (slot?.approval) {
      useChatStore.setState({
        ...idleComposerPatch(),
        running: true,
        runId: slot.runId || null,
        pendingApproval: slot.approval
      })
    } else {
      useChatStore.setState(idleComposerPatch())
    }
  }

  const draft = useChatStore.getState().getSessionDraft(sessionId)
  if (draft) {
    useChatStore.setState({ composer: draft.text })
    setComposerAssets(draft.assets ?? [])
    setQuotedContexts(draft.quotedContexts ?? [])
  } else {
    useChatStore.setState({ composer: "" })
    clearComposerAssets()
    setQuotedContexts([])
  }
}

function applyComposerModel(store: ReturnType<typeof useChatStore.getState>, sessionId: string) {
  const patch = composerModelPatch({
    sessionId,
    sessionModels: store.sessionModels,
    preferredModelId: store.preferredModelId,
    models: store.models
  })
  store.setModel(patch.modelId, patch.modelLabel, patch.provider)
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

/** 新建会话跟 Composer 当前引擎；非法 id 再回落偏好。 */
function resolveCreateRuntime(current: string, preferred: string) {
  for (const id of [current, preferred, DEFAULT_RUNTIME_ID]) {
    const parsed = AgentToolId.safeParse(id)
    if (parsed.success) return parsed.data
  }
  return DEFAULT_RUNTIME_ID
}
