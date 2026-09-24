/**
 * 从某一轮分叉出新会话：只复制可见正文和 runtime，不复制 ACP 绑定。
 */
import { selectForkTurns, SessionForkResult, type SessionForkResult as ForkResult } from "@enjoy-agents/ipc-contract"
import { readPreferences } from "./preferences"
import { persistMessage } from "./persist-session"
import { createSession, listMessages } from "./session-queries"
import { writeSessionRuntime } from "./agent-tools-vault"
import { resolveSessionBinding } from "./agent-run-helpers"
import { getDatabase } from "./database"

/** 这条会话是分叉出来的。ACP 新建进程时才垫先前正文。 */
export function sessionWasForked(sessionId: string): boolean {
  const row = getDatabase()
    .prepare("SELECT forked_from as forkedFrom FROM sessions WHERE id = ?")
    .get(sessionId) as { forkedFrom?: string | null } | undefined
  return Boolean(row?.forkedFrom)
}

/** 同工作区新会话。源会话的 run 与 ACP 绑定不动。 */
export async function forkSession(sessionId: string, messageId: string): Promise<ForkResult> {
  const source = readSource(sessionId)
  const rows = await listMessages(sessionId)
  const selected = selectForkTurns(rows, messageId)
  if (!selected.ok) throw new Error(selected.code)

  const title = forkTitle(source.title)
  const created = await createSession(source.workspaceId, title)
  getDatabase()
    .prepare("UPDATE sessions SET forked_from = ? WHERE id = ?")
    .run(sessionId, created.id)
  for (const turn of selected.turns) {
    persistMessage(created.id, turn.role, turn.content)
  }

  const bound = resolveSessionBinding(sessionId, readPreferences())
  writeSessionRuntime(created.id, bound.runtimeId, bound.modelId)
  const runtimeId = bound.runtimeId
  const modelId = bound.modelId
  return SessionForkResult.parse({ ...created, runtimeId, modelId })
}

function readSource(sessionId: string): { workspaceId: string; title: string } {
  const row = getDatabase()
    .prepare("SELECT workspace_id as workspaceId, title FROM sessions WHERE id = ?")
    .get(sessionId) as { workspaceId?: string; title?: string } | undefined
  if (!row?.workspaceId || !row.title) throw new Error("FORK_SESSION_NOT_FOUND")
  return { workspaceId: row.workspaceId, title: row.title }
}

function forkTitle(sourceTitle: string): string {
  const prefix = readPreferences().language === "en" ? "Fork" : "分叉"
  const next = `${prefix} · ${sourceTitle}`.replace(/\s+/g, " ").trim()
  return next.slice(0, 80) || prefix
}
