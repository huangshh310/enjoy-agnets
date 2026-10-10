/**
 * 聊天会话 Zustand store。类型在 chat-store.types.ts，树灌入在 chat-store-hydrate.ts。
 */
import { create } from "zustand"
import { markModelsListed } from "../hooks/models-listed.ts"
import { thoughtLevelOption, type StreamEvent } from "@enjoy-agents/ipc-contract"
import { relativeTime } from "../lib/time"
import { reduceStreamEvent } from "./apply-stream-event"
import { holdApprovalResolved } from "./held-approval-resolved"
import { shouldBufferComposerEvent } from "./stream-run-scope"
import { buildSessionTree, buildWorkspaceTree } from "./chat-store-hydrate"
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

export const useChatStore = create<ChatStore>((set, get) => ({
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
  sidebarCollapsed: false,
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
  runStartedAt: null,
  pendingStreamEvents: [],
  thinkingLabel: "Thinking",
  hasKey: false,
  selectedFilePath: null,
  selectedFileContent: "",
  changes: [],
  additions: 0,
  deletions: 0,
  sessionReviewDismissedKey: null,
  pendingApproval: null,
  error: null,
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
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
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
    if (shouldBufferComposerEvent(get().running, get().runId)) {
      const queued = get().pendingStreamEvents
      if (queued.length >= 80) return
      set({ pendingStreamEvents: [...queued, event] })
      return
    }
    const patch = reduceStreamEvent(get().messages, event, get().runId)
    const sessionId = get().sessionId
    if (patch.heldResolved && sessionId) {
      holdApprovalResolved(sessionId, patch.heldResolved)
    }
    set({
      messages: patch.messages,
      ...(patch.thinkingLabel ? { thinkingLabel: patch.thinkingLabel } : {}),
      ...(patch.pendingApproval !== undefined ? { pendingApproval: patch.pendingApproval } : {}),
      ...(patch.running !== undefined ? { running: patch.running } : {}),
      ...(patch.running === true ? { runStartedAt: get().runStartedAt ?? Date.now() } : {}),
      ...(patch.running === false ? { runStartedAt: null } : {}),
      ...(patch.runId !== undefined ? { runId: patch.runId } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      ...(patch.notice !== undefined ? { notice: patch.notice } : {})
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
    set({ messages, composer: "", error: null, notice: null })
    return messages
  },
  setRunning: (running, runId = null) => {
    set({
      running,
      runId: runId ?? null,
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
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
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
  setChanges: (changes: ChangedFileRow[]) => {
    const additions = changes.reduce((sum, file) => sum + file.additions, 0)
    const deletions = changes.reduce((sum, file) => sum + file.deletions, 0)
    set({ changes, additions, deletions })
  },
  setSessionReviewDismissedKey: (sessionReviewDismissedKey) => set({ sessionReviewDismissedKey }),
  setPendingApproval: (pendingApproval) => set({ pendingApproval }),
  setModels: (models) => {
    markModelsListed()
    set({ models })
  },
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
  setSession: (sessionId, sessionTitle) =>
    set((state) => ({
      sessionId,
      sessionTitle,
      notice: null,
      repositories: state.repositories.map((node: RepositoryNode) =>
        node.id === sessionId ? { ...node, name: sessionTitle } : node
      )
    })),
  setMessages: (messages) => set({ messages })
}))

export function formatNodeTime(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ""
  return relativeTime(timestamp)
}
