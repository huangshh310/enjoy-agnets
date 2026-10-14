/**
 * Inbox 待验收：只认库里 workflow_status = needs_review 且未归档。
 */
import { ReviewChangedFiles, SessionsNeedsReviewInput, type SessionsNeedsReviewResult } from "@enjoy-agents/ipc-contract"
import { listSessionsNeedingReview } from "@enjoy-agents/db"
import { getDatabase } from "./database"

export function listSessionsNeedingReviewForInbox(raw: unknown): SessionsNeedsReviewResult {
  SessionsNeedsReviewInput.parse(raw ?? {})
  return {
    items: listSessionsNeedingReview(getDatabase()).map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      title: row.title,
      updatedAt: row.updatedAt,
      workflowStatus: row.workflowStatus,
      ...reviewFields(row.reviewChangedFiles, row.reviewCompletedAt)
    }))
  }
}

function reviewFields(
  files: string | null | undefined,
  completedAt: string | null | undefined
): { changedFiles?: { names: string[]; total: number }; completedAt?: string } {
  const changedFiles = parseChangedFiles(files)
  return {
    ...(changedFiles ? { changedFiles } : {}),
    ...(completedAt ? { completedAt } : {})
  }
}

function parseChangedFiles(raw: string | null | undefined) {
  if (!raw) return undefined
  try {
    const parsed = ReviewChangedFiles.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
