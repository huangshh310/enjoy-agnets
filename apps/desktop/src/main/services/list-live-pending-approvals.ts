/**
 * Inbox 拍板：只认库里 decision IS NULL 且未归档会话。
 */
import { ApprovalsPendingInput, type ApprovalsPendingResult } from "@enjoy-agents/ipc-contract"
import { listLivePendingApprovals } from "@enjoy-agents/db"
import { getDatabase } from "./database"

export function listPendingApprovalsForInbox(raw: unknown): ApprovalsPendingResult {
  ApprovalsPendingInput.parse(raw ?? {})
  return { items: listLivePendingApprovals(getDatabase()) }
}