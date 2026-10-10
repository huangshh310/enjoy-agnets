import type { SessionPatchInput, SessionSummary } from "@enjoy-agents/ipc-contract"
import { listMessageParts } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { backfillUserFileParts } from "./persist-user-attachments"
import { getWorkspace } from "./workspace"

export async function listSessions(workspaceId: string): Promise<SessionSummary[]> {
  const rows = getDatabase()
    .prepare(
      `SELECT id, workspace_id as workspaceId, title, created_at as createdAt, updated_at as updatedAt,
              flagged, workflow_status as workflowStatus, goal, recap
       FROM sessions WHERE workspace_id = ? AND archived_at IS NULL ORDER BY updated_at DESC`
    )
    .all(workspaceId) as Array<{
    id: string
    workspaceId: string
    title: string
    createdAt: number
    updatedAt: number
    flagged: number
    workflowStatus: string | null
    goal: string | null
    recap: string | null
  }>

  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    flagged: Boolean(r.flagged),
    workflowStatus: (r.workflowStatus as SessionSummary["workflowStatus"]) ?? null,
    goal: r.goal ?? null,
    recap: r.recap ?? null
  }))
}

export async function patchSession(input: SessionPatchInput): Promise<SessionSummary> {
  const db = getDatabase()
  const current = db
    .prepare(
      `SELECT id, workspace_id as workspaceId, title, created_at as createdAt, updated_at as updatedAt,
              flagged, workflow_status as workflowStatus, goal, recap
       FROM sessions WHERE id = ?`
    )
    .get(input.id) as {
    id: string
    workspaceId: string
    title: string
    createdAt: number
    updatedAt: number
    flagged: number
    workflowStatus: string | null
    goal: string | null
    recap: string | null
  } | undefined

  if (!current) {
    throw new Error(`Session ${input.id} not found.`)
  }

  const newTitle = input.title !== undefined ? input.title : current.title
  const newFlagged = input.flagged !== undefined ? (input.flagged ? 1 : 0) : current.flagged
  const newStatus =
    input.workflowStatus !== undefined ? input.workflowStatus : current.workflowStatus
  const newGoal = input.goal !== undefined ? input.goal : current.goal
  const newRecap = input.recap !== undefined ? input.recap : current.recap

  // 注意：session.patch 绝不更新 updated_at，保证会话列表活跃度排序不被旗标/状态改动所干扰
  db.prepare(
    `UPDATE sessions
     SET title = ?, flagged = ?, workflow_status = ?, goal = ?, recap = ?
     WHERE id = ?`
  ).run(newTitle, newFlagged, newStatus, newGoal, newRecap, input.id)

  return {
    id: current.id,
    workspaceId: current.workspaceId,
    title: newTitle,
    createdAt: current.createdAt,
    updatedAt: current.updatedAt,
    flagged: Boolean(newFlagged),
    workflowStatus: (newStatus as SessionSummary["workflowStatus"]) ?? null,
    goal: newGoal ?? null,
    recap: newRecap ?? null
  }
}

export async function listMessages(sessionId: string) {
  const rows = getDatabase()
    .prepare(
      "SELECT id, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(sessionId) as Array<{
    id: string
    sessionId: string
    role: string
    content: string
    createdAt: number
  }>
  return backfillUserFileParts(
    rows.map((row) => ({
      ...row,
      parts: listMessageParts(getDatabase(), row.id).map((part) => JSON.parse(part.payload) as unknown)
    }))
  )
}

/** 检查器 preview：Goal / Recap 是否会在下一轮垫进模型。 */
export function readSessionContext(sessionId: string): { goal: string | null; recap: string | null } {
  const row = getDatabase()
    .prepare("SELECT goal, recap FROM sessions WHERE id = ?")
    .get(sessionId) as { goal: string | null; recap: string | null } | undefined
  return { goal: row?.goal ?? null, recap: row?.recap ?? null }
}

/** 检查器 preview / 规则注入：会话所属工作区根。找不到则空。 */
export async function workspaceRootForSession(sessionId: string): Promise<string | undefined> {
  const row = getDatabase()
    .prepare("SELECT workspace_id as workspaceId FROM sessions WHERE id = ?")
    .get(sessionId) as { workspaceId?: string } | undefined
  if (!row?.workspaceId) return undefined
  try {
    return (await getWorkspace(row.workspaceId)).rootPath
  } catch {
    return undefined
  }
}

export async function createSession(workspaceId: string, title: string): Promise<SessionSummary> {
  await getWorkspace(workspaceId)
  const now = Date.now()
  const record: SessionSummary = {
    id: createId("ses"),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now,
    flagged: false,
    workflowStatus: null,
    goal: null,
    recap: null
  }
  getDatabase()
    .prepare(
      "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at, flagged) VALUES (?, ?, ?, ?, ?, 0)"
    )
    .run(record.id, record.workspaceId, record.title, now, now)
  return record
}

