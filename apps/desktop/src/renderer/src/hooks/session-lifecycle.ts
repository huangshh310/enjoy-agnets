/**
 * 打开 / 新建会话：停车当前 run，不 abort 后台轮。
 */
import { AgentToolId, migrateContentToParts, safeValidateUIMessages } from "@enjoy-agents/ipc-contract"
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
import { bindSessionRuntime } from "./persist-runtime"

export type WorkspaceRow = { id: string; name: string; rootPath: string }
type SessionRow = { id: string; workspaceId: string; title: string; updatedAt: number }
type MessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  parts?: unknown[]
}

export async function loadSession(sessionId: string, title: string) {
  const store = useChatStore.getState()
  const sameSession = store.sessionId === sessionId
  const previous = sameSession ? store.messages : []
  if (!sameSession) {
    if (store.sessionId) parkForegroundRun()
    store.setSession(sessionId, title)
    store.setRuntimeId(pickSessionRuntime(sessionId, store.sessionRuntimes, store.preferredRuntimeId))
    restoreComposerForSession(sessionId)
  } else {
    store.setSession(sessionId, title)
  }
  const rows = (await getIde().session.messages({ sessionId })) as MessageRow[]
  restoreUiMessages(rows)
  store.setMessages(mergeUserAssets(threadFromRows(rows), previous))
}

export async function createAndOpenSession(workspaceId: string, customTitle = "New agent") {
  parkForegroundRun()
  const session = (await getIde().session.create({
    workspaceId,
    title: customTitle
  })) as SessionRow
  const store = useChatStore.getState()
  const runtimeId = resolveCreateRuntime(store.runtimeId, store.preferredRuntimeId)
  useChatStore.setState(idleComposerPatch())
  store.setSession(session.id, session.title)
  store.setRuntimeId(runtimeId)
  store.setMessages([])
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
      store.setWorkspace({
        id: workspace.id,
        name: workspace.name,
        rootPath: workspace.rootPath || ""
      })
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
    return
  }
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
    return
  }
  useChatStore.setState(idleComposerPatch())
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
