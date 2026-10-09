/**
 * 审批行记下当时发给 SDK 的 response，以及 SDK 原始入参。
 */
import type { Migration } from "./types.ts"

export const approvalSdkResponseMigration: Migration = {
  version: 14,
  name: "approval-sdk-response",
  sql: `
    ALTER TABLE approvals ADD COLUMN request_args TEXT;
    ALTER TABLE approvals ADD COLUMN sdk_approved INTEGER;
    ALTER TABLE approvals ADD COLUMN sdk_reason TEXT;
    ALTER TABLE approvals ADD COLUMN resume_code TEXT;
  `
}
