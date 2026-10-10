/**
 * 全量灌入侧栏项目树。重叠刷新只认最后一次，避免创建后被旧 list 快照盖掉。
 */
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import type { WorkspaceRow } from "./workspace-row"

type SessionRow = {
  id: string
  workspaceId: string
  title: string
  updatedAt: number
  flagged?: boolean
  workflowStatus?: "todo" | "in_progress" | "needs_review" | "done" | null
  goal?: string | null
  recap?: string | null
}

let refreshGeneration = 0
let appliedGeneration = 0
const inFlight = new Set<number>()
type HydrateItems = Array<{
  workspace: WorkspaceRow
  sessions: Array<{
    id: string
    title: string
    updatedAt: number
    workspaceId: string
    flagged?: boolean
    workflowStatus?: SessionRow["workflowStatus"]
    goal?: string | null
    recap?: string | null
  }>
}>
let lastSuccess: { generation: number; items: HydrateItems } | null = null

/** 测试之间清代数，避免并行用例互相踩。 */
export function resetRefreshWorkspacesForTest() {
  refreshGeneration = 0
  appliedGeneration = 0
  inFlight.clear()
  lastSuccess = null
}

export type WorkspaceHydrateSink = {
  hydrate: (items: HydrateItems, activeWorkspaceId?: string | null) => void
  activeWorkspaceId: () => string | null
}

export async function refreshAllWorkspaces() {
  if (!hasIde()) return
  await refreshWorkspacesInto({
    hydrate: (items, activeId) => {
      useChatStore.getState().hydrateWorkspacesAndSessions(items, activeId)
    },
    activeWorkspaceId: () => useChatStore.getState().workspaceId
  })
}

/** 生产灌入路径；测试用内存 sink，避免测试直接依赖 chat-store。 */
export async function refreshWorkspacesInto(sink: WorkspaceHydrateSink) {
  const generation = ++refreshGeneration
  inFlight.add(generation)
  try {
    const items = await collectWorkspaceHydrateItems()
    if (!lastSuccess || generation >= lastSuccess.generation) {
      lastSuccess = { generation, items }
    }
  } catch {
    // 最新一次失败时保留最近成功的名单，finally 里决定是否灌入
  } finally {
    inFlight.delete(generation)
    applyLatestSuccess(sink)
  }
}

function applyLatestSuccess(sink: WorkspaceHydrateSink) {
  if (!lastSuccess) return
  const newestInFlight = inFlight.size ? Math.max(...inFlight) : 0
  if (lastSuccess.generation < newestInFlight) return
  if (lastSuccess.generation <= appliedGeneration) return
  sink.hydrate(lastSuccess.items, sink.activeWorkspaceId())
  appliedGeneration = lastSuccess.generation
}

async function collectWorkspaceHydrateItems() {
  const workspaces = (await getIde().workspace.list()) as WorkspaceRow[]
  return Promise.all(workspaces.map((workspace) => hydrateOneWorkspace(workspace)))
}

async function hydrateOneWorkspace(workspace: WorkspaceRow) {
  const row = {
    id: workspace.id,
    name: workspace.name,
    rootPath: workspace.rootPath,
    kind: workspace.kind,
    sshStatus: workspace.sshStatus,
    sshHost: workspace.sshHost,
    sshUser: workspace.sshUser,
    remotePath: workspace.remotePath
  }
  try {
    const sessions = (await getIde().session.list({ workspaceId: workspace.id })) as SessionRow[]
    return {
      workspace: row,
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        workspaceId: session.workspaceId,
        flagged: session.flagged,
        workflowStatus: session.workflowStatus,
        goal: session.goal,
        recap: session.recap
      }))
    }
  } catch {
    return { workspace: row, sessions: [] }
  }
}
