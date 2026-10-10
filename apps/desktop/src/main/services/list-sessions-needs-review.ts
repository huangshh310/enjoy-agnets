/**
 * Inbox 待验收：只认库里 workflow_status = needs_review 且未归档。
 */
import { SessionsNeedsReviewInput, type SessionsNeedsReviewResult } from "@enjoy-agents/ipc-contract"
import { listSessionsNeedingReview } from "@enjoy-agents/db"
import { getDatabase } from "./database"

export function listSessionsNeedingReviewForInbox(raw: unknown): SessionsNeedsReviewResult {
  SessionsNeedsReviewInput.parse(raw ?? {})
  return { items: listSessionsNeedingReview(getDatabase()) }
}
