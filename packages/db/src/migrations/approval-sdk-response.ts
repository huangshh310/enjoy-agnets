/**
 * 审批行记下当时发给 SDK 的 response、原始入参，以及 SDK 侧 approval id。
 * 列已在就跳过（旧 #119 曾占用 v14，或 repairClaimedV14 已补过）。
 */
import { ensureApprovalSdkColumns } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const approvalSdkResponseMigration: Migration = {
  version: 14,
  name: "approval-sdk-response",
  apply(sqlite) {
    ensureApprovalSdkColumns(sqlite)
  }
}
