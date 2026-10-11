/**
 * 显式截断会话：renderer 必须交出 after/from + 看见的尾巴。
 * 库尾必须与名单完全一致；活 run / waiting_review 拒绝；整段 BEGIN IMMEDIATE。
 */
import { deleteMessageParts } from "@enjoy-agents/db"
import {
  TRUNCATE_MESSAGE_NOT_FOUND,
  TRUNCATE_RUN_ACTIVE,
  TRUNCATE_STALE_SNAPSHOT,
  type SessionTruncateResult
} from "@enjoy-agents/ipc-contract/session-truncate"
import { listActiveRuns } from "./agent-run-state.ts"
import { clearConversationSessionAllow } from "./conversation-session-allow.ts"
import { advanceSessionAllowWatermark } from "./conversation-session-allow-history.ts"
import { getDatabase } from "./database.ts"
import { clearInspectPromptSnapshot } from "./inspect-prompt-snapshot.ts"
import { persistUserTurn } from "./persist-user-attachments.ts"
import { clearSessionCompaction } from "./session-compaction-store.ts"
import type { UserFileAsset } from "./user-attachment-parts.ts"

export {
  TRUNCATE_MESSAGE_NOT_FOUND,
  TRUNCATE_RUN_ACTIVE,
  TRUNCATE_STALE_SNAPSHOT
}

export type ExplicitTruncateInput = {
  sessionId: string
  expectedTailIds: string[]
  reason: string
  afterMessageId?: string
  fromMessageId?: string
  persistUser?: { content: string; messageId?: string; attached: UserFileAsset[] }
  /** 只做活 run / 尾巴预检，通过也不删（rewind 还原文件前先问）。 */
  dryRun?: boolean
}

let throwAfterFirstDeleteForTest = false

export function setTruncateThrowAfterFirstDeleteForTest(value: boolean): void {
  throwAfterFirstDeleteForTest = value
}

function listSessionMessageIds(sessionId: string): string[] {
  return (
    getDatabase()
      .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
      .all(sessionId) as Array<{ id: string }>
  ).map((row) => row.id)
}

export function sessionHasBlockingRun(sessionId: string): boolean {
  if (listActiveRuns().some(({ run }) => run.input.sessionId === sessionId)) return true
  const row = getDatabase()
    .prepare(
      "SELECT 1 as hit FROM runs WHERE session_id = ? AND status IN ('running', 'waiting_review') LIMIT 1"
    )
    .get(sessionId) as { hit?: number } | undefined
  return row != null
}

function resolveTail(ids: string[], input: ExplicitTruncateInput): string[] | undefined {
  if (input.fromMessageId != null) {
    const index = ids.indexOf(input.fromMessageId)
    if (index < 0) return undefined
    return ids.slice(index)
  }
  if (input.afterMessageId != null) {
    const index = ids.indexOf(input.afterMessageId)
    if (index < 0) return undefined
    return ids.slice(index + 1)
  }
  return undefined
}

function tailsMatch(dbTail: string[], expected: string[]): boolean {
  if (dbTail.length !== expected.length) return false
  return dbTail.every((id, index) => id === expected[index])
}

export function applyExplicitSessionTruncate(input: ExplicitTruncateInput): SessionTruncateResult {
  const db = getDatabase()
  db.exec("BEGIN IMMEDIATE;")
  let deleted = 0
  let wroteUser = false
  try {
    if (sessionHasBlockingRun(input.sessionId)) {
      db.exec("ROLLBACK;")
      return { ok: false, code: TRUNCATE_RUN_ACTIVE }
    }
    let ids: string[]
    try {
      ids = listSessionMessageIds(input.sessionId)
    } catch {
      db.exec("ROLLBACK;")
      return { ok: false, code: TRUNCATE_STALE_SNAPSHOT }
    }
    const dbTail = resolveTail(ids, input)
    if (!dbTail) {
      db.exec("ROLLBACK;")
      return { ok: false, code: TRUNCATE_MESSAGE_NOT_FOUND }
    }
    if (!tailsMatch(dbTail, input.expectedTailIds)) {
      db.exec("ROLLBACK;")
      return { ok: false, code: TRUNCATE_STALE_SNAPSHOT }
    }
    if (input.dryRun) {
      db.exec("ROLLBACK;")
      return { ok: true, deleted: 0 }
    }
    if (dbTail.length === 0 && !input.persistUser) {
      db.exec("ROLLBACK;")
      return { ok: true, deleted: 0 }
    }
    const deleteMessage = db.prepare("DELETE FROM messages WHERE id = ?")
    for (const id of dbTail) {
      deleteMessageParts(db, id)
      deleteMessage.run(id)
      if (throwAfterFirstDeleteForTest) throw new Error("TRUNCATE_TEST_INJECTED")
    }
    if (input.persistUser) {
      persistUserTurn(
        input.sessionId,
        input.persistUser.content,
        input.persistUser.attached,
        input.persistUser.messageId,
        { inTransaction: true }
      )
      wroteUser = true
    }
    deleted = dbTail.length
    db.exec("COMMIT;")
  } catch (error) {
    db.exec("ROLLBACK;")
    throw error
  }

  if (deleted === 0 && wroteUser) {
    advanceSessionAllowWatermark(input.sessionId)
  }
  if (deleted > 0) {
    clearConversationSessionAllow(input.sessionId)
    clearInspectPromptSnapshot(input.sessionId)
    void clearSessionCompaction(input.sessionId)
    console.info("session truncate", {
      sessionId: input.sessionId,
      deleted,
      reason: input.reason
    })
  }
  return { ok: true, deleted }
}

export async function truncateSessionFrom(
  sessionId: string,
  messageId: string,
  expectedTailIds: string[],
  opts?: { dryRun?: boolean }
): Promise<SessionTruncateResult> {
  return applyExplicitSessionTruncate({
    sessionId,
    fromMessageId: messageId,
    expectedTailIds,
    reason: "rewind",
    dryRun: opts?.dryRun === true
  })
}

/** 兼容旧调用：保留 keep 之后的尾巴，必须带看见的名单。 */
export async function truncateSessionAfter(
  sessionId: string,
  keepMessageId: string,
  expectedTailIds: string[]
): Promise<SessionTruncateResult> {
  return applyExplicitSessionTruncate({
    sessionId,
    afterMessageId: keepMessageId,
    expectedTailIds,
    reason: "after"
  })
}
