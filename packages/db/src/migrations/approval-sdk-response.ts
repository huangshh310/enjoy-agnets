/**
 * 审批行记下当时发给 SDK 的 response、原始入参，以及 SDK 侧 approval id。
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
    ALTER TABLE approvals ADD COLUMN sdk_approval_id TEXT;
    UPDATE approvals SET sdk_approval_id = id WHERE sdk_approval_id IS NULL;
    CREATE UNIQUE INDEX approvals_sdk_identity
      ON approvals (run_id, tool_call_id, COALESCE(sdk_approval_id, id));
  `
}
