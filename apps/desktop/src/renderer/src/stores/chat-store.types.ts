/**
 * 聊天会话 store 的数据形状。实现仍在 chat-store.ts。
 */
import type { StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { ComposerRunKind } from "../hooks/composer-run-kind"

export type ChatRole = "user" | "assistant"

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh"

export type CodeAttachment = {
  language: string
  filename: string
  additions: number
  deletions: number
  code: string
}

export type ThreadSource = {
  sourceId: string
  title: string
  path: string
  startLine?: number
  snippet?: string
}

export type ThreadAsset = {
  assetId: string
  mediaType: string
  name: string
  url?: string
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
  sources?: ThreadSource[]
  assets?: ThreadAsset[]
  structured?: unknown
  components?: Array<{ componentId: string; props: Record<string, unknown> }>
  /** 本轮赞踩，仅会话内存，不落库 */
  feedback?: "up" | "down"
  /** 发送时 stamp，Thinking / 生图表面认这个，不认当前 picker */
  runKind?: ComposerRunKind
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
  reasoningEffort?: ReasoningEffort
  capabilities?: string[]
  staticCaps?: string[]
  probedCaps?: string[]
  probedAt?: number
}

export type WorkspaceSessionHydrate = {
  workspace: { id: string; name: string; rootPath?: string }
  sessions: Array<{ id: string; title: string; updatedAt: number; workspaceId: string }>
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
  reasoningEffort: ReasoningEffort | undefined
  mode: "agent" | "plan" | "ask" | "debug"
  running: boolean
  runId: string | null
  /** composer 尚未拿到 runId 时暂存事件，避免旁路 Extract 写进乐观轮 */
  pendingStreamEvents: StreamEvent[]
  thinkingLabel: string
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
    items: WorkspaceSessionHydrate[],
    activeWorkspaceId?: string | null
  ) => void
  setComposer: (value: string) => void
  setModel: (
    id: string,
    label: string,
    provider?: string,
    reasoningEffort?: ReasoningEffort
  ) => void
  setReasoningEffort: (effort: ReasoningEffort | undefined) => void
  setMode: (mode: ChatStore["mode"]) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setRightPanelCollapsed: (collapsed: boolean) => void
  toggleExpanded: (id: string) => void
  applyStreamEvent: (event: StreamEvent) => void
  appendUserMessage: (content: string, assets?: ThreadAsset[]) => ThreadMessage[]
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
