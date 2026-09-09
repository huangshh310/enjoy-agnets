/**
 * 会话列表 / 消息 / 新建。从 agent-runner 拆出，避免编排文件超 300 行。
 */
import { listMessageParts } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { backfillUserFileParts } from "./persist-user-attachments"
import { getWorkspace } from "./workspace"

export async function listSessions(workspaceId: string) {
  return getDatabase()
    .prepare(
      "SELECT id, workspace_id as workspaceId, title, created_at as createdAt, updated_at as updatedAt FROM sessions WHERE workspace_id = ? AND archived_at IS NULL ORDER BY updated_at DESC"
    )
    .all(workspaceId)
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

export async function createSession(workspaceId: string, title: string) {
  await getWorkspace(workspaceId)
  const now = Date.now()
  const record = {
    id: createId("ses"),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now
  }
  getDatabase()
    .prepare(
      "INSERT INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(record.id, record.workspaceId, record.title, record.createdAt, record.updatedAt)
  return record
}
