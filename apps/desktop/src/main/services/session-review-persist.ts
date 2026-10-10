/**
 * 待验收元数据落库。只在 turn 标 needs_review 时写；没有新文件名则保留旧的。
 */
import { ReviewChangedFiles, type TurnOutcome } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

export function persistSessionReview(sessionId: string | undefined, turn: TurnOutcome): void {
  if (!sessionId || turn.workflow !== "needs_review") return
  try {
    const db = getDatabase()
    if (turn.changedFiles) {
      db.prepare(
        "UPDATE sessions SET review_changed_files = ?, review_completed_at = ? WHERE id = ?"
      ).run(JSON.stringify(turn.changedFiles), turn.completedAt ?? null, sessionId)
      return
    }
    if (turn.completedAt) {
      db.prepare("UPDATE sessions SET review_completed_at = ? WHERE id = ?").run(
        turn.completedAt,
        sessionId
      )
    }
  } catch {
    // 列未迁完时不要挡收工。
  }
}

export function parseReviewChangedFiles(raw: string | null | undefined): ReviewChangedFiles | undefined {
  if (!raw) return undefined
  try {
    const parsed = ReviewChangedFiles.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
