/**
 * AUTO-P2 错过记录与补跑来源。记录只存本机，不进云同步。
 */
import { z } from "zod"
import { AutomationIdInput, AutomationRunStatus, AutomationSkipReason } from "./automations.ts"

/** 抽屉「展开错过记录」只看跳过与补跑，不含准点成功。 */
export const AutomationMissedKind = z.enum(["skipped", "catch_up"])
export type AutomationMissedKind = z.infer<typeof AutomationMissedKind>

/** 错过记录回看窗。只记记录，不决定能不能补。 */
export const MISSED_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

/** 最近一次错过点超过此时长只记跳过，不补跑。 */
export const CATCH_UP_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** 补跑停在 Dock 超过此时长则自动拒绝。只改这一处。 */
export const CATCH_UP_APPROVAL_TIMEOUT_MS = 30 * 60 * 1000
export const CATCH_UP_APPROVAL_TIMEOUT = "catch_up_approval_timeout"
export const CATCH_UP_INTERRUPTED_BY_RESTART = "interrupted_by_restart"

/** 待审批 Dock / 通知用来源句。C 端只写名称与「补跑」。 */
export const AutomationRunSource = z
  .object({
    automationId: z.string().min(1),
    automationName: z.string().min(1),
    scheduledAt: z.number().int(),
    isCatchUp: z.boolean()
  })
  .strict()
export type AutomationRunSource = z.infer<typeof AutomationRunSource>

export const AutomationMissedRecord = z
  .object({
    automationId: z.string().min(1),
    scheduledAt: z.number().int(),
    recordedAt: z.number().int(),
    kind: AutomationMissedKind,
    reason: AutomationSkipReason.optional(),
    status: AutomationRunStatus.optional(),
    runId: z.string().min(1).optional(),
    isCatchUp: z.boolean().optional(),
    /** 抽屉读这个：catch_up_approval_timeout / interrupted_by_restart。 */
    code: z.string().min(1).optional()
  })
  .strict()
export type AutomationMissedRecord = z.infer<typeof AutomationMissedRecord>

export const ListAutomationMissedInput = AutomationIdInput
export type ListAutomationMissedInput = z.infer<typeof ListAutomationMissedInput>

export const ListAutomationMissedResult = z
  .object({
    records: z.array(AutomationMissedRecord)
  })
  .strict()
export type ListAutomationMissedResult = z.infer<typeof ListAutomationMissedResult>
