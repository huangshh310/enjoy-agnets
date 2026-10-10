/**
 * 打开 / 新建会话：停车当前 run，不 abort 后台轮。
 */
import { AgentToolId, type SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import {
  modeForLoadedSession,
  modeForNewSession,
  readRememberedDefaultMode
} from "../components/ai-chat/composer/composer-mode"
import { DEFAULT_RUNTIME_ID, sessionSwitchComposerReset } from "../lib/session-runtime"
import { getIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import {
  captureParkedRun,
  idleComposerPatch,
  parkedComposerPatch
} from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"
import { applySessionHydrate } from "./session-hydrate"
import { bumpSessionHydrateGeneration } from "./session-hydrate-generation"
import { messagesAfterSessionSwitch } from "./session-hydrate-finish"
import { composerModelPatch } from "../lib/session-model.ts"
import { bindSessionRuntime } from "./persist-runtime"
import { useEngineHandoffStore } from "../components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { connectSshIfNeeded, disconnectPreviousSsh } from "./ssh-session-switch"
import { clearComposerAssets, listComposerAssets, setComposerAssets } from "./composer-assets"
import { listQuotedContexts, setQuotedContexts } from "./quoted-context"
import { workspaceRowFromNode } from "./workspace-row"
import { noteExternalNavigation } from "@renderer/hooks/nav-history/nav-history-gate"
import { discardCreatedSession } from "./discard-created-session"
import { refreshAllWorkspaces } from "./refresh-workspaces"
import {
  beginNewSessionCreate,
  currentCreateToken,
  failNewSessionCreate,
  finishNewSessionCreate,
  isCurrentCreateToken,
  shouldPublishCreatedSession
} from "./new-session-create"
import { absorbAssetsIntoQueuedSend } from "./queue-composer-send"
import { queueComposerFocus } from "./composer-focus"

export type { WorkspaceRow } from "./workspace-row"
export { refreshAllWorkspaces } from "./refresh-workspaces"
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

async function sessionOwnActiveRunning(sessionId: string): Promise<boolean> {
  try {
    const active = (await getIde().agent.sessionActive({ sessionId })) as {
      running?: boolean
    }
    return active?.running === true
  } catch {
    return false
  }
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

export async function loadSession(sessionId: string, title: string, stale?: () => boolean) {
  if (!stale) noteExternalNavigation()
  if (stale?.()) return
  const store = useChatStore.getState()
  const { sameSession } = messagesAfterSessionSwitch({
    currentSessionId: store.sessionId,
    nextSessionId: sessionId,
    liveMessages: store.messages
  })
  const generation = bumpSessionHydrateGeneration()
  const parkedRunning = useAttentionStore.getState().parks[sessionId]?.running === true
  const sessionRunning = (await sessionOwnActiveRunning(sessionId)) || parkedRunning
  if (!sameSession) {
    if (store.sessionId) {
      parkForegroundRun()
      saveCurrentSessionDraft()
    }
    store.setSession(sessionId, title)
    store.setMessages([])
    const next = sessionSwitchComposerReset({
      nextSessionId: sessionId,
      sessionRuntimes: store.sessionRuntimes,
      preferredRuntimeId: store.preferredRuntimeId
    })
    store.setRuntimeId(next.runtimeId)
    store.setAgentPickerOpen(next.agentPickerOpen)
    applyComposerModel(store, sessionId)
    useChatStore.setState({ mode: modeForLoadedSession(store.sessionModes[sessionId]) })
    useEngineHandoffStore.getState().resetPending()
    restoreComposerForSession(sessionId)
  } else {
    store.setSession(sessionId, title)
  }
  const rows = (await getIde().session.messages({ sessionId })) as MessageRow[]
  if (stale?.()) return
  applySessionHydrate({
    dbRows: rows,
    sameSession,
    generation,
    sessionId,
    sessionRunning
  })
  useAttentionStore.getState().clearCompleteIfErrored(sessionId)
  queueComposerFocus()
}

export async function createAndOpenSession(workspaceId: string, customTitle = "新对话", stale?: () => boolean) {
  if (!stale) noteExternalNavigation()
  if (stale?.()) return
  const { token } = beginNewSessionCreate()
  parkForegroundRun()
  const composerAtPark = useChatStore.getState().composer
  saveCurrentSessionDraft()
  bumpSessionHydrateGeneration()
  detachForegroundForCreate()
  try {
    const session = (await getIde().session.create({
      workspaceId,
      title: customTitle
    })) as SessionRow
    if (await discardCreatedSession(session.id, stale)) {
      failNewSessionCreate(token, new Error("SESSION_CREATE_STALE"))
      return
    }
    const store = useChatStore.getState()
    if (
      !shouldPublishCreatedSession({
        token,
        pendingToken: currentCreateToken(),
        createdWorkspaceId: workspaceId,
        storeWorkspaceId: store.workspaceId
      })
    ) {
      if (isCurrentCreateToken(token)) {
        failNewSessionCreate(token, new Error("SESSION_CREATE_WORKSPACE_CHANGED"))
      }
      await getIde().session.delete({ sessionId: session.id }).catch(() => undefined)
      return
    }
    const typedDuringCreate = store.composer
    const runtimeId = resolveCreateRuntime(store.runtimeId, store.preferredRuntimeId)
    absorbAssetsIntoQueuedSend(listComposerAssets())
    publishCreatedSession(store, session, runtimeId)
    if (typedDuringCreate && typedDuringCreate !== composerAtPark) {
      useChatStore.setState({ composer: typedDuringCreate })
    }
    finishNewSessionCreate(token, session.id)
    await bindSessionRuntime(session.id, runtimeId)
    if (await discardCreatedSession(session.id, stale)) return
    await refreshAllWorkspaces()
  } catch (error) {
    failNewSessionCreate(token, error)
    throw error
  }
}

/** 立刻露出欢迎页，但 sessionId 要等 create 回来。发送走排队，不占 running。 */
function detachForegroundForCreate() {
  useChatStore.setState({
    ...idleComposerPatch(),
    sessionId: null,
    messages: [],
    sessionTitle: "新对话",
    composer: "",
    running: false
  })
  queueComposerFocus()
}

export async function selectPersistedSession(
  sessionId: string,
  workspaceId?: string,
  stale?: () => boolean
): Promise<boolean> {
  if (!stale) noteExternalNavigation()
  if (stale?.()) return false
  const store = useChatStore.getState()
  const node = store.repositories.find((item) => item.id === sessionId)
  if (!node || node.kind !== "session") return false
  const switched = await switchSessionWorkspace(store, node, workspaceId, stale)
  if (!switched || stale?.()) return false
  await loadSession(node.id, node.name, stale)
  return !stale?.()
}

async function switchSessionWorkspace(
  store: ReturnType<typeof useChatStore.getState>,
  node: { workspaceId?: string; parentId?: string },
  workspaceId: string | undefined,
  stale?: () => boolean
): Promise<boolean> {
  const targetWorkspaceId = workspaceId ?? node.workspaceId ?? node.parentId
  if (!targetWorkspaceId || store.workspaceId === targetWorkspaceId) return true
  const workspace = store.repositories.find((item) => item.id === targetWorkspaceId && item.kind === "workspace")
  if (!workspace) return true
  const row = workspaceRowFromNode(workspace)
  await disconnectPreviousSsh(store.workspaceId, store.workspaceKind, row.id)
  if (stale?.()) return false
  store.setWorkspace(row)
  await connectSshIfNeeded(row)
  return !stale?.()
}

function publishCreatedSession(
  store: ReturnType<typeof useChatStore.getState>,
  session: SessionRow,
  runtimeId: ReturnType<typeof resolveCreateRuntime>
) {
  useChatStore.setState({ ...idleComposerPatch(), composer: "" })
  clearComposerAssets()
  setQuotedContexts([])
  useEngineHandoffStore.getState().resetPending()
  store.setSession(session.id, session.title)
  store.setRuntimeId(runtimeId)
  store.setMessages([])
  store.setMode(modeForNewSession(readRememberedDefaultMode()))
  applyComposerModel(store, session.id)
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

/** 新建会话跟 Composer 当前引擎；非法 id 再回落偏好。 */
function resolveCreateRuntime(current: string, preferred: string) {
  for (const id of [current, preferred, DEFAULT_RUNTIME_ID]) {
    const parsed = AgentToolId.safeParse(id)
    if (parsed.success) return parsed.data
  }
  return DEFAULT_RUNTIME_ID
}
