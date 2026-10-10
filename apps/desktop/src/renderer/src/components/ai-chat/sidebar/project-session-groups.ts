/**
 * 「按项目」视图：每条会话只出现一次；无匹配项目的进「其他对话」。
 * 不画单独的「最近」组（那会把最新几条再渲染一遍）。
 */
export type ProjectGroupNode = {
  id: string
  name: string
  kind: "workspace" | "session"
  parentId?: string
}

export type ProjectViewSessionRow = {
  id: string
  name: string
  group: "project" | "other"
  workspaceId?: string
}

export function workspaceIdsOf(nodes: ProjectGroupNode[]): Set<string> {
  return new Set(nodes.filter((node) => node.kind === "workspace").map((node) => node.id))
}

export function isOrphanSession(session: ProjectGroupNode, workspaceIds: Set<string>): boolean {
  if (session.kind !== "session") return false
  return !session.parentId || !workspaceIds.has(session.parentId)
}

export function sessionsForWorkspace<T extends ProjectGroupNode>(
  sessions: T[],
  workspaceId: string
): T[] {
  return sessions.filter((session) => session.kind === "session" && session.parentId === workspaceId)
}

export function orphanSessions<T extends ProjectGroupNode>(
  sessions: T[],
  workspaceIds: Set<string>
): T[] {
  return sessions.filter((session) => isOrphanSession(session, workspaceIds))
}

export function projectViewSessionRows(nodes: ProjectGroupNode[]): ProjectViewSessionRow[] {
  const workspaceIds = workspaceIdsOf(nodes)
  const workspaces = nodes.filter((node) => node.kind === "workspace")
  const sessions = nodes.filter((node) => node.kind === "session")
  const rows: ProjectViewSessionRow[] = []
  for (const workspace of workspaces) {
    for (const session of sessionsForWorkspace(sessions, workspace.id)) {
      rows.push({
        id: session.id,
        name: session.name,
        group: "project",
        workspaceId: workspace.id
      })
    }
  }
  for (const session of orphanSessions(sessions, workspaceIds)) {
    rows.push({ id: session.id, name: session.name, group: "other" })
  }
  return rows
}

export function countTitleInProjectView(nodes: ProjectGroupNode[], title: string): number {
  return projectViewSessionRows(nodes).filter((row) => row.name === title).length
}

export function seedSessionTitle(index: number): string {
  return index === 0 ? "New agent" : `Seed session ${String(index).padStart(2, "0")}`
}

export function seedProjectNodes(count = 30): ProjectGroupNode[] {
  const workspace: ProjectGroupNode = { id: "ws", name: "demo", kind: "workspace" }
  const sessions = Array.from({ length: count }, (_, index) => ({
    id: `seed-${index}`,
    name: seedSessionTitle(index),
    kind: "session" as const,
    parentId: workspace.id
  }))
  return [workspace, ...sessions]
}
