/**
 * 聊天会话 Zustand store。类型在 chat-store.types.ts，树灌入在 chat-store-hydrate.ts。
 */
import { create } from "zustand"
import {
  NARROW_SIDEBAR_PX,
  initSidebarCollapse,
  onSidebarManual,
  onSidebarOverlayDismiss,
  onSidebarWidth,
  sidebarManualPersists,
  sidebarCollapsed,
  type SidebarCollapseState
} from "../components/app-shell/chrome/sidebar-collapse-state.ts"
import { thoughtLevelOption, type StreamEvent } from "@enjoy-agents/ipc-contract"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { consumeRestartNotice, rememberRestartNotice } from "../hooks/hydrate-restart-notice"
import { noteSessionOpened } from "../hooks/session-history-pending"
import { formatSidebarTime } from "../lib/sidebar-time"
import { reduceStreamEvent } from "./apply-stream-event"
import {
  isDiscardedPreOutputRun,
  rememberDiscardedPreOutputRun
} from "./discarded-pre-output-runs"
import { holdApprovalResolved } from "./held-approval-resolved"
import { isImmediatePreOutputError } from "./pre-output-rollback"
import { errorAfterOptimisticSend, errorAfterStreamEvent } from "./resend-notice"
import { shouldBufferComposerEvent } from "./stream-run-scope"
import { buildSessionTree, buildWorkspaceTree } from "./chat-store-hydrate"
import { withErrorRetryInvariant } from "./error-retry-invariant"
import type { ChatStore, ChangedFileRow, RepositoryNode, ThreadMessage } from "./chat-store.types"

export type {
  AgentMode,
  ChangedFileRow,
  ChatRole,
  ChatStore,
  CodeAttachment,
  ModelOption,
  ReasoningEffort,
  RepositoryNode,
  ThreadAsset,
  ThreadMessage,
  ThreadSource
} from "./chat-store.types"

export const useChatStore = create<ChatStore>()(withErrorRetryInvariant((set, get) => ({
  userName: "Enjoy Agents",
  workspaceId: null,
  workspaceName: "No workspace",
  workspaceRootLabel: "open a folder",
  workspaceRootPath: null,
  workspaceKind: "local" as const,
  remoteStatus: null,
  remoteLabel: null,
  remoteError: null,
  sessionId: null,
  sessionTitle: "新对话",
  repositories: [],
  expandedIds: [],
  sidebarCollapsed: sidebarCollapsed(initialSidebarCollapse()),
  sidebarCollapseState: initialSidebarCollapse(),
  rightPanelCollapsed: true,
  messages: [],
  composer: "",
  modelId: "",
  modelLabel: "",
  models: [],
  provider: null,
  runtimeId: "enjoy-local",
  preferredRuntimeId: "enjoy-local",
  preferredModelId: "",
  sessionRuntimes: {},
  sessionModels: {},
  sessionModelSwitches: {},
  sessionModes: {},
  sessionHandoffCuts: {},
  reasoningEffort: undefined,
  acpThoughtLevel: undefined,
  acpConfigOptions: [],
  isFastMode: false,
  mode: "agent",
  running: false,
  runId: null,
  lastRunId: null,
  runStartedAt: null,
  pendingStreamEvents: [],
  thinkingLabel: "Thinking",
  hasKey: false,
  selectedFilePath: null,
  selectedFileContent: "",
  changes: [],
  gitRepo: null,
  changesLoadedAt: 0,
  additions: 0,
  deletions: 0,
  sessionReviewDismissedKey: null,
  pendingApproval: null,
  error: null,
  errorRetry: null,
  preparingHint: false,
  preparingSessionId: null,
  notice: null,
  agentPickerOpen: false,
  sidebarGrouping: "project",
  sessionSortOrder: "priority",
  pinnedWorkspaceIds: [],
  sessionDrafts: {},
  saveSessionDraft: (sessionId, draft) =>
    set((state) => ({ sessionDrafts: { ...state.sessionDrafts, [sessionId]: draft } })),
  getSessionDraft: (sessionId) => get().sessionDrafts[sessionId],
  clearSessionDraft: (sessionId) =>
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.sessionDrafts
      return { sessionDrafts: rest }
    }),
  setComposer: (composer) => set({ composer }),
  setRuntimeId: (runtimeId) => set({ runtimeId, acpConfigOptions: [] }),
  setPreferredRuntimeId: (preferredRuntimeId) => set({ preferredRuntimeId }),
  setPreferredModelId: (preferredModelId) => set({ preferredModelId }),
  setSessionRuntimes: (sessionRuntimes) => set({ sessionRuntimes }),
  setSessionModels: (sessionModels) => set({ sessionModels }),
  markModelSwitch: (sessionId) =>
    set((state) => ({
      sessionModelSwitches: { ...state.sessionModelSwitches, [sessionId]: true }
    })),
  markHandoffCut: (sessionId, at) =>
    set((state) => ({
      sessionHandoffCuts: { ...state.sessionHandoffCuts, [sessionId]: at }
    })),
  setModel: (modelId, modelLabel, provider, effort) =>
    set({
      modelId,
      modelLabel,
      ...(provider ? { provider } : {}),
      reasoningEffort: effort
    }),
  setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
  setAcpThoughtLevel: (acpThoughtLevel) => set({ acpThoughtLevel }),
  setFastMode: (isFastMode) => set({ isFastMode }),
  toggleFastMode: () => set((state) => ({ isFastMode: !state.isFastMode })),
  setMode: (mode) =>
    set((state) => ({
      mode,
      sessionModes: state.sessionId
        ? { ...state.sessionModes, [state.sessionId]: mode }
        : state.sessionModes
    })),
  // 手动开关：只有这里写偏好（leo #151：窄窗自动收起不算用户偏好）。
  setSidebarCollapsed: (collapsed) =>
    set((state) => {
      const next = onSidebarManual(state.sidebarCollapseState, collapsed)
      // 窄窗里开关只管本次浮层，不写偏好（leo #154 M1）。
      if (sidebarManualPersists(state.sidebarCollapseState)) writeSidebarCollapsed(next.preferred)
      return { sidebarCollapseState: next, sidebarCollapsed: sidebarCollapsed(next) }
    }),
  setSidebarNarrow: (narrow) =>
    set((state) => {
      const next = onSidebarWidth(state.sidebarCollapseState, narrow)
      if (next === state.sidebarCollapseState) return {}
      return { sidebarCollapseState: next, sidebarCollapsed: sidebarCollapsed(next) }
    }),
  // 窄窗浮层点外部 / Esc 关掉：只收本次，不写偏好（luna z151-1）。
  dismissSidebarOverlay: () =>
    set((state) => {
      const next = onSidebarOverlayDismiss(state.sidebarCollapseState)
      if (next === state.sidebarCollapseState) return {}
      return { sidebarCollapseState: next, sidebarCollapsed: sidebarCollapsed(next) }
    }),
  setRightPanelCollapsed: (rightPanelCollapsed) => set({ rightPanelCollapsed }),
  toggleExpanded: (id) => {
    const expandedIds = get().expandedIds.includes(id)
      ? get().expandedIds.filter((item) => item !== id)
      : [...get().expandedIds, id]
    set({ expandedIds })
  },
  applyStreamEvent: (event: StreamEvent) => {
    if (event.type === "session.config") {
      const thought = thoughtLevelOption(event.configOptions)
      const current = typeof thought?.currentValue === "string" ? thought.currentValue : undefined
      set({
        acpConfigOptions: event.configOptions,
        ...(current ? { acpThoughtLevel: current } : {})
      })
      return
    }
    const eventRunId = "runId" in event ? event.runId : undefined
    if (isDiscardedPreOutputRun(eventRunId)) return
    if (shouldBufferComposerEvent(get().running, get().runId) && !isImmediatePreOutputError(event)) {
      const queued = get().pendingStreamEvents
      if (queued.length >= 80) return
      set({ pendingStreamEvents: [...queued, event] })
      return
    }
    const beforeCount = get().messages.length
    const patch = reduceStreamEvent(get().messages, event, get().runId, get().running)
    if (event.type === "run.error" && patch.messages.length < beforeCount) {
      rememberDiscardedPreOutputRun(event.runId)
    }
    const sessionId = get().sessionId
    const noticeSessionId = sessionId ?? event.sessionId
    if (patch.notice !== undefined && noticeSessionId && isRestoreFamilyCode(patch.notice)) {
      rememberRestartNotice(noticeSessionId, patch.notice)
    }
    if (patch.heldResolved && sessionId) {
      holdApprovalResolved(sessionId, patch.heldResolved)
    }
    const error = errorAfterStreamEvent(get().error, event, patch.error)
    set({
      messages: patch.messages,
      ...(patch.thinkingLabel ? { thinkingLabel: patch.thinkingLabel } : {}),
      ...(patch.pendingApproval !== undefined ? { pendingApproval: patch.pendingApproval } : {}),
      ...(patch.running !== undefined ? { running: patch.running } : {}),
      ...(patch.running === true ? { runStartedAt: get().runStartedAt ?? Date.now() } : {}),
      ...(patch.running === false ? { runStartedAt: null } : {}),
      ...(patch.runId !== undefined ? { runId: patch.runId } : {}),
      ...(typeof patch.runId === "string" ? { lastRunId: patch.runId } : {}),
      ...(error !== undefined ? { error } : {}),
      ...(patch.notice !== undefined ? { notice: patch.notice } : {}),
      ...(patch.composer !== undefined ? { composer: patch.composer } : {})
    })
  },
  appendUserMessage: (content, assets) => {
    const messages: ThreadMessage[] = [
      ...get().messages,
      {
        id: `msg_user_${crypto.randomUUID()}`,
        role: "user",
        content,
        createdAt: Date.now(),
        ...(assets?.length ? { assets } : {})
      }
    ]
    set({ messages, composer: "", error: errorAfterOptimisticSend(get().error), notice: null })
    return messages
  },
  setRunning: (running, runId = null) => {
    set({
      running,
      runId: runId ?? null,
      ...(typeof runId === "string" ? { lastRunId: runId } : {}),
      runStartedAt: running ? (get().runStartedAt ?? Date.now()) : null,
      ...(running ? { sessionReviewDismissedKey: null } : {}),
      ...(!running ? { pendingStreamEvents: [] } : {})
    })
    if (!running || !runId) return
    const queued = get().pendingStreamEvents
    if (queued.length === 0) return
    set({ pendingStreamEvents: [] })
    for (const event of queued) get().applyStreamEvent(event)
  },
  setHasKey: (hasKey) => set({ hasKey }),
  setError: (error, retryTarget) =>
    set({ error, errorRetry: error && retryTarget ? { error, target: retryTarget } : null }),
  setPreparingHint: (preparingHint, sessionId) => set({ preparingHint, preparingSessionId: preparingHint ? (sessionId === undefined ? get().sessionId : sessionId) : null }),
  setNotice: (notice) => {
    const sessionId = get().sessionId
    if (sessionId && isRestoreFamilyCode(notice)) rememberRestartNotice(sessionId, notice)
    if (sessionId && notice === null && isRestoreFamilyCode(get().notice)) {
      consumeRestartNotice(sessionId, [...get().messages].reverse().find((row) => row.role === "assistant")?.id)
    }
    set({ notice })
  },
  setAgentPickerOpen: (agentPickerOpen) => set({ agentPickerOpen }),
  setRemoteStatus: (remoteStatus, remoteLabel, remoteError) =>
    set((state) => ({
      remoteStatus,
      remoteLabel: remoteLabel === undefined ? state.remoteLabel : remoteLabel,
      remoteError:
        remoteError !== undefined
          ? remoteError
          : remoteStatus === "failed"
            ? state.remoteError
            : null
    })),
  setWorkspace: (workspace) => {
    if (!workspace) {
      set({
        workspaceId: null,
        workspaceName: "No workspace",
        workspaceRootLabel: "open a folder",
        workspaceRootPath: null,
        workspaceKind: "local",
        remoteStatus: null,
        remoteLabel: null,
        remoteError: null,
        sessionId: null,
        sessionTitle: "新对话",
        lastRunId: null,
        repositories: [],
        expandedIds: [],
        messages: [],
        changes: [],
        additions: 0,
        deletions: 0,
        sessionReviewDismissedKey: null,
        selectedFilePath: null,
        selectedFileContent: ""
      })
      return
    }
    set({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceRootLabel: workspace.rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace.name,
      workspaceRootPath: workspace.rootPath,
      workspaceKind: workspace.kind === "ssh" ? "ssh" : "local",
      remoteStatus: workspace.kind === "ssh" ? (workspace.sshStatus ?? "idle") : null,
      remoteLabel: workspace.kind === "ssh" ? workspace.rootPath : null,
      remoteError: null
    })
  },
  setSelectedFile: (selectedFilePath, selectedFileContent) =>
    set({ selectedFilePath, selectedFileContent }),
  setChanges: (changes: ChangedFileRow[], gitRepo?: boolean | null) => {
    const current = get()
    const nextGit = gitRepo === undefined ? current.gitRepo : gitRepo
    if (current.gitRepo === nextGit && sameChangeRows(current.changes, changes)) {
      set({ changesLoadedAt: Date.now() })
      return
    }
    const additions = changes.reduce((sum, file) => sum + file.additions, 0)
    const deletions = changes.reduce((sum, file) => sum + file.deletions, 0)
    set({
      changes,
      additions,
      deletions,
      gitRepo: nextGit,
      changesLoadedAt: Date.now()
    })
  },
  setSessionReviewDismissedKey: (sessionReviewDismissedKey) => set({ sessionReviewDismissedKey }),
  setPendingApproval: (pendingApproval) => set({ pendingApproval }),
  setModels: (models) => set({ models }),
  setProvider: (provider) => set({ provider }),
  setSidebarGrouping: (sidebarGrouping) => set({ sidebarGrouping }),
  setSessionSortOrder: (sessionSortOrder) => set({ sessionSortOrder }),
  togglePinWorkspace: (id) =>
    set((state) => ({
      pinnedWorkspaceIds: state.pinnedWorkspaceIds.includes(id)
        ? state.pinnedWorkspaceIds.filter((item) => item !== id)
        : [...state.pinnedWorkspaceIds, id]
    })),
  patchSessionNode: (id, patch) =>
    set((state) => ({
      repositories: state.repositories.map((node) =>
        node.id === id ? { ...node, ...patch } : node
      )
    })),
  hydrateWorkspacesAndSessions: (items, activeWorkspaceId) => {
    const tree = buildWorkspaceTree(
      items,
      get().pinnedWorkspaceIds,
      get().expandedIds,
      get().repositories.some((node) => node.kind === "workspace"),
      activeWorkspaceId
    )
    set(tree)
  },
  hydrateSessions: (workspace, sessions) => {
    set({
      repositories: buildSessionTree(workspace, sessions),
      expandedIds: [workspace.id]
    })
  },
  setSession: (sessionId, sessionTitle) => {
    // 换到这个会话：之前的「已回灌」标记作废，等本次回灌（luna/leo #157：A→B→A、A→空首页/创建窗→A 都不闪空态）。
    // 例外：publishCreatedComposer 先打过标的新建会话（beforeOpen），保留。
    if (get().sessionId !== sessionId) noteSessionOpened(sessionId)
    set((state) => ({
      sessionId,
      sessionTitle,
      ...(state.sessionId === sessionId ? {} : { notice: null, errorRetry: null }), // 换会话：目标属于旧会话
      repositories: state.repositories.map((node: RepositoryNode) =>
        node.id === sessionId ? { ...node, name: sessionTitle } : node
      )
    }))
  },
  setMessages: (messages) => set({ messages })
})))

export function formatNodeTime(
  timestamp: number,
  t: (path: string, vars?: Record<string, string | number>) => string = (path) => path
): string {
  return formatSidebarTime(timestamp, t)
}

/** 工作区 git 状态投递：相同快照保持旧引用，避免审查栏 effect 空转。 */
function sameChangeRows(left: ChangedFileRow[], right: ChangedFileRow[]): boolean {
  if (left === right) return true
  if (left.length !== right.length) return false
  return left.every((row, index) => {
    const other = right[index]
    return (
      other != null &&
      row.path === other.path &&
      row.status === other.status &&
      row.additions === other.additions &&
      row.deletions === other.deletions &&
      row.staged === other.staged &&
      row.worktree === other.worktree
    )
  })
}

/** 启动：偏好从存储读，窄窗只影响本次运行。函数声明会提升；这里不放模块级 let，免 TDZ。 */
function initialSidebarCollapse(): SidebarCollapseState {
  const narrow = typeof window !== "undefined" && window.innerWidth < NARROW_SIDEBAR_PX
  return initSidebarCollapse(readSidebarCollapsed(), narrow)
}

/** 侧栏折叠偏好（只存手动开关）。函数声明会提升，键名写在函数里免 TDZ。 */
function sidebarCollapsedKey(): string {
  return "enjoy.sidebarCollapsed"
}

function readSidebarCollapsed(): boolean {
  try {
    if (typeof localStorage === "undefined") return false
    return localStorage.getItem(sidebarCollapsedKey()) === "1"
  } catch {
    return false
  }
}

function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(sidebarCollapsedKey(), collapsed ? "1" : "0")
  } catch {
    // 存不了就只在本次生效。
  }
}
