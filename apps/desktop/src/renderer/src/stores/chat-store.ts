import { create } from "zustand"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { relativeTime } from "../lib/time"

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
}

export type RepositoryNode = {
  id: string
  name: string
  kind: "workspace" | "session"
  parentId?: string
  updatedAt: number
  workspaceId?: string
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
  messages: ThreadMessage[]
  composer: string
  modelId: string
  modelLabel: string
  models: ModelOption[]
  provider: string | null
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
  rightTab: "changes" | "browser"
  pendingApproval: (StreamEvent & { type: "approval.required" }) | null
  error: string | null
  setComposer: (value: string) => void
  setModel: (id: string, label: string) => void
  setMode: (mode: ChatStore["mode"]) => void
  setRightTab: (tab: ChatStore["rightTab"]) => void
  setSettingsOpen: (open: ChatStore["settingsOpen"]) => void
  setApiKeyDraft: (value: string) => void
  setProviderDraft: (value: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
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
  messages: [],
  composer: "",
  modelId: "deepseek-chat",
  modelLabel: "DeepSeek V4",
  models: [],
  provider: null,
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
  rightTab: "changes",
  pendingApproval: null,
  error: null,
  setComposer: (composer) => set({ composer }),
  setModel: (modelId, modelLabel) => set({ modelId, modelLabel }),
  setMode: (mode) => set({ mode }),
  setRightTab: (rightTab) => set({ rightTab }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setApiKeyDraft: (apiKeyDraft) => set({ apiKeyDraft }),
  setProviderDraft: (providerDraft) => set({ providerDraft }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleExpanded: (id) => {
    const expandedIds = get().expandedIds.includes(id)
      ? get().expandedIds.filter((item) => item !== id)
      : [...get().expandedIds, id]
    set({ expandedIds })
  },
  applyStreamEvent: (event) => {
    if (event.type === "text.delta") {
      const messages = [...get().messages]
      const last = messages.at(-1)
      if (last?.role === "assistant" && last.streaming) {
        last.content += event.text
      } else {
        messages.push({
          id: `msg_${event.runId}`,
          role: "assistant",
          content: event.text,
          createdAt: Date.now(),
          streaming: true
        })
      }
      set({ messages, thinkingLabel: "Writing" })
    } else if (event.type === "reasoning.delta") {
      set({ thinkingLabel: "Thinking" })
    } else if (event.type === "tool.start") {
      set({ thinkingLabel: event.name.replaceAll("_", " ") })
    } else if (event.type === "approval.required") {
      set({ pendingApproval: event, thinkingLabel: "Waiting for approval" })
    } else if (event.type === "approval.resolved") {
      set({ pendingApproval: null })
    } else if (event.type === "run.end") {
      set({
        running: false,
        runId: null,
        pendingApproval: null,
        messages: get().messages.map((message) => ({ ...message, streaming: false }))
      })
    } else if (event.type === "run.error") {
      set({
        running: false,
        error: event.message,
        messages: get().messages.map((message) => ({ ...message, streaming: false }))
      })
    }
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
  setSession: (sessionId, sessionTitle) => set({ sessionId, sessionTitle }),
  setMessages: (messages) => set({ messages })
}))

export function formatNodeTime(timestamp: number): string {
  return relativeTime(timestamp)
}

export function contextUsed(messages: ThreadMessage[]): number {
  return contextUsedFrom(messages)
}
