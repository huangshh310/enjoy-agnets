/**
 * 会话工单查询。Inbox 待验收只认库里的 workflow_status。
 */
import type { AppDatabase } from "../client"

export type SessionNeedsReviewRow = {
  id: string
  workspaceId: string | null
  title: string
  updatedAt: number
  workflowStatus: "needs_review"
  reviewChangedFiles?: string | null
  reviewCompletedAt?: string | null
}

/** Inbox 待验收真源：main 判定并落库的 needs_review，未归档。不看 git dirty。 */
export function listSessionsNeedingReview(db: AppDatabase): SessionNeedsReviewRow[] {
  return db
    .prepare(
      `SELECT id as id, workspace_id as workspaceId, title as title,
              updated_at as updatedAt, workflow_status as workflowStatus,
              review_changed_files as reviewChangedFiles,
              review_completed_at as reviewCompletedAt
       FROM sessions
       WHERE workflow_status = 'needs_review' AND archived_at IS NULL
       ORDER BY updated_at DESC`
    )
    .all() as SessionNeedsReviewRow[]
}
