import { create } from "zustand"
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { relativeTime } from "../lib/time"
import { reduceStreamEvent } from "./apply-stream-event"

export type ChatRole = "user" | "assistant"

export type CodeAttachment = {
  language: string
  filename: string
  additions: number
  deletions: number
  code: string
}

export type ThreadMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  attachment?: CodeAttachment
  streaming?: boolean
  /** 模型思考轨迹（reasoning.delta 累积） */
  reasoning?: string
  /** 本轮工具调用与结果 */
  tools?: ThreadToolCall[]
  /** 结束后保留 Thinking 头的秒数 */
  thoughtSeconds?: number
  /** 正在吃 text 里的 <think> 块，不持久化 */
  thinkOpen?: boolean
  sources?: Array<{
    sourceId: string
    title: string
    path: string
    startLine?: number
    snippet?: string
  }>
  assets?: Array<{ assetId: string; mediaType: string; name: string }>
  structured?: unknown
  components?: Array<{ componentId: string; props: Record<string, unknown> }>
}

export type RepositoryNode = {
  id: string
  name: string
  kind: "workspace" | "session"
  parentId?: string
  updatedAt: number
  workspaceId?: string
  rootPath?: string
  isPinned?: boolean
}

export type ChangedFileRow = {
  path: string
  status: "added" | "modified" | "deleted" | "untracked"
  additions: number
  deletions: number
}

export type ModelOption = {
  id: string
  label: string
  provider: string
  providerId?: string
  providerName?: string
  apiStyle?: string
  active?: boolean
  isFast?: boolean
  isReasoning?: boolean
  supportsReasoning?: boolean
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  capabilities?: string[]
  staticCaps?: string[]
  probedCaps?: string[]
  probedAt?: number
}

export type ChatStore = {
  userName: string
  workspaceId: string | null
  workspaceName: string
  workspaceRootLabel: string
  sessionId: string | null
  sessionTitle: string
  repositories: RepositoryNode[]
  expandedIds: string[]
  sidebarCollapsed: boolean
  /** Changes / Browser 右栏是否收起 */
  rightPanelCollapsed: boolean
  messages: ThreadMessage[]
  composer: string
  modelId: string
  modelLabel: string
  models: ModelOption[]
  provider: string | null
  reasoningEffort: "low" | "medium" | "high" | "xhigh" | undefined
  mode: "agent" | "plan" | "ask" | "debug"
  running: boolean
  runId: string | null
  thinkingLabel: string
  settingsOpen: string | false
  apiKeyDraft: string
  providerDraft: string
  hasKey: boolean
  selectedFilePath: string | null
  selectedFileContent: string
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  pendingApproval: (StreamEvent & { type: "approval.required" }) | null
  error: string | null
  sidebarGrouping: "project" | "flat"
  sessionSortOrder: "priority" | "updated" | "manual"
  pinnedWorkspaceIds: string[]
  setSidebarGrouping: (grouping: "project" | "flat") => void
  setSessionSortOrder: (order: "priority" | "updated" | "manual") => void
  togglePinWorkspace: (id: string) => void
  hydrateWorkspacesAndSessions: (
    items: Array<{
      workspace: { id: string; name: string; rootPath?: string }
      sessions: Array<{ id: string; title: string; updatedAt: number; workspaceId: string }>
    }>,
    activeWorkspaceId?: string | null
  ) => void
  setComposer: (value: string) => void
  setModel: (id: string, label: string, provider?: string, reasoningEffort?: "low" | "medium" | "high" | "xhigh") => void
  setReasoningEffort: (effort: "low" | "medium" | "high" | "xhigh" | undefined) => void
  setMode: (mode: ChatStore["mode"]) => void
  setSettingsOpen: (open: ChatStore["settingsOpen"]) => void
  setApiKeyDraft: (value: string) => void
  setProviderDraft: (value: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setRightPanelCollapsed: (collapsed: boolean) => void
  toggleExpanded: (id: string) => void
  applyStreamEvent: (event: StreamEvent) => void
  appendUserMessage: (content: string) => ThreadMessage[]
  setRunning: (running: boolean, runId?: string | null) => void
  setHasKey: (hasKey: boolean) => void
  setError: (message: string | null) => void
  setWorkspace: (workspace: { id: string; name: string; rootPath: string } | null) => void
  setSelectedFile: (path: string | null, content: string) => void
  setChanges: (changes: ChangedFileRow[]) => void
  setPendingApproval: (event: ChatStore["pendingApproval"]) => void
  setModels: (models: ModelOption[]) => void
  setProvider: (provider: string | null) => void
  hydrateSessions: (
    workspace: { id: string; name: string },
    sessions: Array<{ id: string; title: string; updatedAt: number; workspaceId: string }>
  ) => void
  setSession: (sessionId: string, title: string) => void
  setMessages: (messages: ThreadMessage[]) => void
}

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
  rightPanelCollapsed: false,
  messages: [],
  composer: "",
  modelId: "deepseek-chat",
  modelLabel: "DeepSeek V4",
  models: [],
  provider: null,
  reasoningEffort: undefined,
  mode: "agent",
  running: false,
  runId: null,
  thinkingLabel: "Thinking",
  settingsOpen: false,
  apiKeyDraft: "",
  providerDraft: "deepseek",
  hasKey: false,
  selectedFilePath: null,
  selectedFileContent: "",
  changes: [],
  additions: 0,
  deletions: 0,
  pendingApproval: null,
  error: null,
  setComposer: (composer) => set({ composer }),
  setModel: (modelId, modelLabel, provider, effort) =>
    set({
      modelId,
      modelLabel,
      ...(provider ? { provider } : {}),
      reasoningEffort: effort
    }),
  setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
  setMode: (mode) => set({ mode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setApiKeyDraft: (apiKeyDraft) => set({ apiKeyDraft }),
  setProviderDraft: (providerDraft) => set({ providerDraft }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setRightPanelCollapsed: (rightPanelCollapsed) => set({ rightPanelCollapsed }),
  toggleExpanded: (id) => {
    const expandedIds = get().expandedIds.includes(id)
      ? get().expandedIds.filter((item) => item !== id)
      : [...get().expandedIds, id]
    set({ expandedIds })
  },
  applyStreamEvent: (event) => {
    const patch = reduceStreamEvent(get().messages, event)
    set({
      messages: patch.messages,
      ...(patch.thinkingLabel ? { thinkingLabel: patch.thinkingLabel } : {}),
      ...(patch.pendingApproval !== undefined ? { pendingApproval: patch.pendingApproval } : {}),
      ...(patch.running !== undefined ? { running: patch.running } : {}),
      ...(patch.runId !== undefined ? { runId: patch.runId } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {})
    })
  },
  appendUserMessage: (content) => {
    const messages = [
      ...get().messages,
      { id: `msg_user_${Date.now()}`, role: "user" as const, content, createdAt: Date.now() }
    ]
    set({ messages, composer: "", error: null })
    return messages
  },
  setRunning: (running, runId = null) => set({ running, runId: runId ?? null }),
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
  setChanges: (changes) => {
    const additions = changes.reduce((sum, file) => sum + file.additions, 0)
    const deletions = changes.reduce((sum, file) => sum + file.deletions, 0)
    set({ changes, additions, deletions })
  },
  setPendingApproval: (pendingApproval) => set({ pendingApproval }),
  setModels: (models) => set({ models }),
  setProvider: (provider) => set({ provider }),
  sidebarGrouping: "project",
  sessionSortOrder: "priority",
  pinnedWorkspaceIds: [],
  setSidebarGrouping: (sidebarGrouping) => set({ sidebarGrouping }),
  setSessionSortOrder: (sessionSortOrder) => set({ sessionSortOrder }),
  togglePinWorkspace: (id) =>
    set((state) => ({
      pinnedWorkspaceIds: state.pinnedWorkspaceIds.includes(id)
        ? state.pinnedWorkspaceIds.filter((item) => item !== id)
        : [...state.pinnedWorkspaceIds, id]
    })),
  hydrateWorkspacesAndSessions: (items, activeWorkspaceId) => {
    const pinned = get().pinnedWorkspaceIds
    const repositories: RepositoryNode[] = []
    const liveIds = new Set(items.map((item) => item.workspace.id))
    const expanded = get().expandedIds.filter((id) => liveIds.has(id))
    // 仅首次灌入时默认展开当前工作区；之后尊重用户收起，避免刷新把树撑开
    const hadRepos = get().repositories.some((node) => node.kind === "workspace")
    if (
      !hadRepos &&
      activeWorkspaceId &&
      liveIds.has(activeWorkspaceId) &&
      !expanded.includes(activeWorkspaceId)
    ) {
      expanded.push(activeWorkspaceId)
    }

    for (const item of items) {
      repositories.push({
        id: item.workspace.id,
        name: item.workspace.name,
        kind: "workspace",
        updatedAt: Date.now(),
        rootPath: item.workspace.rootPath,
        isPinned: pinned.includes(item.workspace.id)
      })

      for (const session of item.sessions) {
        repositories.push({
          id: session.id,
          name: session.title,
          kind: "session",
          parentId: item.workspace.id,
          updatedAt: session.updatedAt,
          workspaceId: session.workspaceId
        })
      }
    }

    set({ repositories, expandedIds: expanded })
  },
  hydrateSessions: (workspace, sessions) => {
    const repositories: RepositoryNode[] = [
      {
        id: workspace.id,
        name: workspace.name,
        kind: "workspace",
        updatedAt: Date.now()
      },
      ...sessions.map((session) => ({
        id: session.id,
        name: session.title,
        kind: "session" as const,
        parentId: workspace.id,
        updatedAt: session.updatedAt,
        workspaceId: session.workspaceId
      }))
    ]
    set({ repositories, expandedIds: [workspace.id] })
  },
  setSession: (sessionId, sessionTitle) =>
    set((state) => ({
      sessionId,
      sessionTitle,
      repositories: state.repositories.map((node) =>
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
