/**
 * 聊天会话 Zustand store。类型在 chat-store.types.ts，树灌入在 chat-store-hydrate.ts。
 */
import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { relativeTime } from "../lib/time"
import { reduceStreamEvent } from "./apply-stream-event"
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

function contextUsedFrom(messages: ThreadMessage[]): number {
  const characters = messages.reduce((sum, message) => sum + message.content.length, 0)
  return Math.min(99, Math.round((characters / 32_000) * 100))
}

export const useChatStore = create<ChatStore>((set, get) => ({
  userName: "Enjoy Agents",
  workspaceId: null,
  workspaceName: "No workspace",
  workspaceRootLabel: "open a folder",
  sessionId: null,
  sessionTitle: "New agent",
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
  sessionRuntimes: {},
  reasoningEffort: undefined,
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
  pendingApproval: null,
  error: null,
  sidebarGrouping: "project",
  sessionSortOrder: "priority",
  pinnedWorkspaceIds: [],
  setComposer: (composer) => set({ composer }),
  setRuntimeId: (runtimeId) => set({ runtimeId }),
  setPreferredRuntimeId: (preferredRuntimeId) => set({ preferredRuntimeId }),
  setSessionRuntimes: (sessionRuntimes) => set({ sessionRuntimes }),
  setModel: (modelId, modelLabel, provider, effort) =>
    set({
      modelId,
      modelLabel,
      ...(provider ? { provider } : {}),
      reasoningEffort: effort
    }),
  setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
  setFastMode: (isFastMode) => set({ isFastMode }),
  toggleFastMode: () => set((state) => ({ isFastMode: !state.isFastMode })),
  setMode: (mode) => set({ mode }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setRightPanelCollapsed: (rightPanelCollapsed) => set({ rightPanelCollapsed }),
  toggleExpanded: (id) => {
    const expandedIds = get().expandedIds.includes(id)
      ? get().expandedIds.filter((item) => item !== id)
      : [...get().expandedIds, id]
    set({ expandedIds })
  },
  applyStreamEvent: (event: StreamEvent) => {
    if (shouldBufferComposerEvent(get().running, get().runId)) {
      const queued = get().pendingStreamEvents
      if (queued.length >= 80) return
      set({ pendingStreamEvents: [...queued, event] })
      return
    }
    const patch = reduceStreamEvent(get().messages, event, get().runId)
    set({
      messages: patch.messages,
      ...(patch.thinkingLabel ? { thinkingLabel: patch.thinkingLabel } : {}),
      ...(patch.pendingApproval !== undefined ? { pendingApproval: patch.pendingApproval } : {}),
      ...(patch.running !== undefined ? { running: patch.running } : {}),
      ...(patch.running === true ? { runStartedAt: get().runStartedAt ?? Date.now() } : {}),
      ...(patch.running === false ? { runStartedAt: null } : {}),
      ...(patch.runId !== undefined ? { runId: patch.runId } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {})
    })
  },
  appendUserMessage: (content, assets) => {
    const messages: ThreadMessage[] = [
      ...get().messages,
      {
        id: `msg_user_${Date.now()}`,
        role: "user",
        content,
        createdAt: Date.now(),
        ...(assets?.length ? { assets } : {})
      }
    ]
    set({ messages, composer: "", error: null })
    return messages
  },
  setRunning: (running, runId = null) => {
    set({
      running,
      runId: runId ?? null,
      runStartedAt: running ? (get().runStartedAt ?? Date.now()) : null,
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
  setWorkspace: (workspace) => {
    if (!workspace) {
      set({
        workspaceId: null,
        workspaceName: "No workspace",
        workspaceRootLabel: "open a folder",
        sessionId: null,
        sessionTitle: "New agent",
        repositories: [],
        expandedIds: [],
        messages: [],
        changes: [],
        additions: 0,
        deletions: 0,
        selectedFilePath: null,
        selectedFileContent: ""
      })
      return
    }
    set({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceRootLabel: workspace.rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace.name
    })
  },
  setSelectedFile: (selectedFilePath, selectedFileContent) =>
    set({ selectedFilePath, selectedFileContent }),
  setChanges: (changes: ChangedFileRow[]) => {
    const additions = changes.reduce((sum, file) => sum + file.additions, 0)
    const deletions = changes.reduce((sum, file) => sum + file.deletions, 0)
    set({ changes, additions, deletions })
  },
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
      repositories: state.repositories.map((node: RepositoryNode) =>
        node.id === sessionId ? { ...node, name: sessionTitle } : node
      )
    })),
  setMessages: (messages) => set({ messages })
}))

export function formatNodeTime(timestamp: number): string {
  return relativeTime(timestamp)
}

export function contextUsed(messages: ThreadMessage[]): number {
  return contextUsedFrom(messages)
}
