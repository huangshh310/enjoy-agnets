/**
 * 打开 / 新建会话：停车当前 run，不 abort 后台轮。
 */
import { discardEmptySessionOnLeave } from "./discard-empty-on-leave"
import { composerDraftForSession } from "../lib/session-draft-storage"
import { AgentToolId, type SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"
import {
  modeForLoadedSession,
  modeForNewSession,
  readRememberedDefaultMode
} from "../components/ai-chat/composer/composer-mode"
import { pickSessionRuntime } from "../lib/agent-runtime"
import { DEFAULT_RUNTIME_ID } from "../lib/session-runtime"
import { getIde } from "../lib/ide"
import { useAttentionStore } from "../stores/attention/attention-store"
import {
  captureParkedRun,
  idleComposerPatch,
  parkedComposerPatch
} from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"
import { applyHydratedLivePending } from "./hydrate-live-pending-approval"
import { keepRestoreFamilyNotice } from "./hydrate-restart-notice"
import { applySessionHydrate } from "./session-hydrate"
import { restoreSessionErrorFromDb } from "./hydrate-session-error"
import { bumpSessionHydrateGeneration } from "./session-hydrate-generation"
import { messagesAfterSessionSwitch } from "./session-hydrate-finish"
import { composerModelPatch } from "../lib/session-model.ts"
import { bindSessionRuntime } from "./persist-runtime"
import { useEngineHandoffStore } from "../components/ai-chat/agent-picker/handoff/engine-handoff-store"
import { connectSshIfNeeded, disconnectPreviousSsh } from "./ssh-session-switch"
import { detachComposerForCreate, publishCreatedComposer } from "./create-window-composer"
import { settleFailedSessionHydrate } from "./session-hydrate-failure"
import { clearComposerAssets, listComposerAssets, setComposerAssets } from "./composer-assets"
import { listQuotedContexts, setQuotedContexts } from "./quoted-context"
import { workspaceRowFromNode } from "./workspace-row"
import { noteExternalNavigation } from "@renderer/hooks/nav-history/nav-history-gate"
import { discardCreatedSession } from "./discard-created-session"
import { refreshAllWorkspaces } from "./refresh-workspaces"
import { isReusableEmptySession } from "./reuse-empty-session"
import { focusComposerAfterNewSession, queueComposerFocus } from "./composer-focus"
import { isDefaultSessionTitle } from "../lib/session-title"
import {
  beginNewSessionCreate,
  currentCreateToken,
  failNewSessionCreate,
  finishNewSessionCreate,
  isCurrentCreateToken,
  shouldPublishCreatedSession
} from "./new-session-create"
import { cancelQueuedComposerSend, hasQueuedComposerSend } from "./queue-composer-send"
import { flushComposerDomToStore } from "./composer-dom"
import { leaveStateSnapshot } from "./leave-state-snapshot"
import { setComposerWritebackHeld } from "./composer-sync-lock"
import { reportSessionFocus } from "./report-session-focus"

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
  const mainRunning = await sessionOwnActiveRunning(sessionId)
  const sessionRunning = mainRunning || parkedRunning
  if (!sameSession) {
    useAttentionStore.getState().clearCompletes()
    if (store.sessionId) {
      // luna P3：离开的是空「新对话」就删掉（判定在 park / 存稿之前取快照）。
      // leo BLOCK ④(c)：先把输入框 DOM 刷进 store（写回锁期间 store 可能落后于 DOM）。
      flushComposerDomToStore()
      discardEmptySessionOnLeave(leaveStateSnapshot(), sessionId, () => useChatStore.getState().sessionId)
      parkForegroundRun()
      saveCurrentSessionDraft()
    }
    store.setSession(sessionId, title)
    store.setMessages([])
    store.setRuntimeId(pickSessionRuntime(sessionId, store.sessionRuntimes, store.preferredRuntimeId))
    applyComposerModel(store, sessionId)
    useChatStore.setState({ mode: modeForLoadedSession(store.sessionModes[sessionId]) })
    useEngineHandoffStore.getState().resetPending()
    restoreComposerForSession(sessionId)
  } else {
    store.setSession(sessionId, title)
  }
  let rows: MessageRow[]
  try {
    rows = (await getIde().session.messages({ sessionId })) as MessageRow[]
  } catch (error) {
    // leo #157（经 host / leo 同意在 #157 改）：回灌失败别停在加载占位等 8 秒兜底，立刻退回空态；原样抛出。
    throw settleFailedSessionHydrate(error, { sessionId, generation, stale })
  }
  if (stale?.()) return
  applySessionHydrate({
    dbRows: rows,
    sameSession,
    generation,
    sessionId,
    sessionRunning,
    mainRunning
  })
  await applyHydratedLivePending(sessionId)
  // jojo P1：库里有失败 run → 红卡 + 重试；活泵在跑不盖。
  await restoreSessionErrorFromDb(sessionId, {
    running: sessionRunning,
    messages: useChatStore.getState().messages
  })
  useAttentionStore.getState().clearCompleteIfErrored(sessionId)
  reportSessionFocus(sessionId)
  queueComposerFocus()
}

export async function createAndOpenSession(workspaceId: string, customTitle = "新对话", stale?: () => boolean) {
  if (!stale) noteExternalNavigation()
  if (stale?.()) return
  if (isDefaultSessionTitle(customTitle) && isReusableEmptySession(useChatStore.getState(), workspaceId)) {
    cancelQueuedComposerSend()
    useAttentionStore.getState().clearCompletes()
    focusComposerAfterNewSession()
    return
  }
  cancelQueuedComposerSend()
  const { token } = beginNewSessionCreate()
  parkForegroundRun()
  saveCurrentSessionDraft()
  bumpSessionHydrateGeneration()
  detachForegroundForCreate()
  useChatStore.getState().setPreparingHint(true, null)
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
    flushComposerDomToStore()
    const runtimeId = resolveCreateRuntime(store.runtimeId, store.preferredRuntimeId)
    // jojo P1（#155 gate2）：排队首发（A）的附件在按 Enter 时已快照；建好会话时不再把输入框里后贴的图并进 A。
    // 输入框里留着的图（还没发的下一条）绑到新会话的草稿上。
    publishCreatedSession(store, session, runtimeId)
    finishNewSessionCreate(token, session.id)
    if (!hasQueuedComposerSend()) setComposerWritebackHeld(false)
    await bindSessionRuntime(session.id, runtimeId)
    if (await discardCreatedSession(session.id, stale)) return
    await refreshAllWorkspaces()
  } catch (error) {
    failNewSessionCreate(token, error)
    throw error
  } finally {
    useChatStore.getState().setPreparingHint(false)
    focusComposerAfterNewSession()
  }
}

/** 立刻露出欢迎页，但 sessionId 要等 create 回来。发送走排队，不占 running。 */
function detachForegroundForCreate() {
  detachComposerForCreate()
  reportSessionFocus(null)
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
  publishCreatedComposer(session.id)
  useEngineHandoffStore.getState().resetPending()
  store.setSession(session.id, session.title)
  store.setRuntimeId(runtimeId)
  store.setMessages([])
  store.setMode(modeForNewSession(readRememberedDefaultMode()))
  applyComposerModel(store, session.id)
  reportSessionFocus(session.id)
}

export function parkForegroundRun() {
  const snapped = captureParkedRun(useChatStore.getState())
  if (snapped) useAttentionStore.getState().putPark(snapped)
}

export function restoreComposerForSession(sessionId: string) {
  const park = useAttentionStore.getState().takePark(sessionId)
  const keptNotice = keepRestoreFamilyNotice(useChatStore.getState().notice)
  if (park) {
    useChatStore.setState({
      ...parkedComposerPatch(park),
      notice: park.notice ?? keptNotice
    })
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
        lastRunId: slot.runId || null,
        pendingApproval: slot.approval,
        notice: keptNotice
      })
    } else {
      useChatStore.setState({
        ...idleComposerPatch(),
        notice: keptNotice
      })
    }
  }

  const draft = composerDraftForSession(sessionId)
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

function resolveCreateRuntime(current: string, preferred: string) {
  for (const id of [current, preferred, DEFAULT_RUNTIME_ID]) {
    if (!id) continue
    const parsed = AgentToolId.safeParse(id)
    if (parsed.success) return parsed.data
  }
  return DEFAULT_RUNTIME_ID
}
