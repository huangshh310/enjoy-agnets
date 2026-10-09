/**
 * Automations 列表、写入与立刻开一轮。
 * I4-P1 触发：manual / cron / on_save / webhook（本机 127.0.0.1）。
 */
import { z } from "zod"

/** 预览锁默认端口；只绑 127.0.0.1，不是公网。 */
export const DEFAULT_WEBHOOK_PORT = 8765
export const DEFAULT_WEBHOOK_PATH = "/hooks/enjoy"

/** 内部值；C 端只露探索/执行。与 AgentMode 的 plan/ask/agent 对齐。 */
export const AutomationMode = z.enum(["agent", "plan", "ask"])
export type AutomationMode = z.infer<typeof AutomationMode>

export const AutomationTrigger = z.enum(["manual", "on_save", "cron", "webhook"])
export type AutomationTrigger = z.infer<typeof AutomationTrigger>

export function automationTriggerList(item: {
  trigger: AutomationTrigger
  triggers?: AutomationTrigger[]
}): AutomationTrigger[] {
  return [...new Set([item.trigger, ...(item.triggers ?? [])])]
}

export function automationHasTrigger(
  item: { trigger: AutomationTrigger; triggers?: AutomationTrigger[] },
  trigger: AutomationTrigger
): boolean {
  return automationTriggerList(item).includes(trigger)
}

export const AutomationWebhookPort = z.number().int().min(1).max(65535)

export const AutomationRunStatus = z.enum(["ok", "failed", "running", "skipped"])
export type AutomationRunStatus = z.infer<typeof AutomationRunStatus>

/** 错过原因；C 端映射电脑睡眠 / 应用未运行 / 上次仍在运行。 */
export const AutomationSkipReason = z.enum([
  "system_sleep",
  "app_not_running",
  "previous_still_running"
])
export type AutomationSkipReason = z.infer<typeof AutomationSkipReason>

export const Automation = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  trigger: AutomationTrigger,
  /** 可并存的额外触发；缺省只认 trigger。 */
  triggers: z.array(AutomationTrigger).optional(),
  cronExpr: z.string().optional(),
  timeZone: z.string().optional(),
  webhookPort: AutomationWebhookPort.optional(),
  webhookPath: z.string().optional(),
  /** 本机 webhook 可选 token；空则不校验。 */
  webhookSecret: z.string().optional(),
  runtimeId: z.string().optional(),
  modelId: z.string().optional(),
  /** 内部 ask|plan|agent；C 端只露探索/执行。缺省执行=agent。 */
  mode: AutomationMode.optional(),
  stopOnFailCount: z.number().int().min(1).default(3).optional(),
  consecutiveFails: z.number().int().min(0).default(0).optional(),
  lastRunAt: z.number().optional(),
  lastRunStatus: AutomationRunStatus.optional(),
  lastSessionId: z.string().optional(),
  lastError: z.string().optional(),
  /** 最近一次动作是补跑（无论 ok / failed / running）。 */
  lastRunCatchUp: z.boolean().optional(),
  lastSkipReason: AutomationSkipReason.optional(),
  /** 错过后补跑最近一次。默认关。 */
  catchUpMissed: z.boolean().optional(),
  enabled: z.boolean(),
  updatedAt: z.number()
})
export type Automation = z.infer<typeof Automation>

export const UpsertAutomationInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  prompt: z.string(),
  trigger: AutomationTrigger,
  /** 可并存的额外触发；缺省只认 trigger。 */
  triggers: z.array(AutomationTrigger).optional(),
  cronExpr: z.string().optional(),
  timeZone: z.string().optional(),
  webhookPort: AutomationWebhookPort.optional(),
  webhookPath: z.string().optional(),
  webhookSecret: z.string().optional(),
  runtimeId: z.string().optional(),
  modelId: z.string().optional(),
  mode: AutomationMode.optional(),
  stopOnFailCount: z.number().int().min(1).optional(),
  consecutiveFails: z.number().int().min(0).optional(),
  lastRunAt: z.number().optional(),
  lastRunStatus: AutomationRunStatus.optional(),
  lastSessionId: z.string().optional(),
  lastError: z.string().optional(),
  lastRunCatchUp: z.boolean().optional(),
  lastSkipReason: AutomationSkipReason.optional(),
  catchUpMissed: z.boolean().optional(),
  enabled: z.boolean().default(true)
})
export type UpsertAutomationInput = z.infer<typeof UpsertAutomationInput>

export const AutomationIdInput = z
  .object({
    id: z.string().min(1)
  })
  .strict()
export type AutomationIdInput = z.infer<typeof AutomationIdInput>

/**
 * 立刻开一轮。不带 sessionId 时 main 新建会话。
 * workspaceId 可省，回落 lastWorkspaceId。
 */
export const RunAutomationInput = z
  .object({
    id: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    workspaceId: z.string().min(1).optional()
  })
  .strict()
export type RunAutomationInput = z.infer<typeof RunAutomationInput>

export const AutomationRunResult = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    workspaceId: z.string(),
    runId: z.string().optional()
  })
  .strict()
export type AutomationRunResult = z.infer<typeof AutomationRunResult>

export const AutomationsChangedEvent = z
  .object({
    reason: z.enum(["upsert", "remove", "run", "status", "missed"]),
    id: z.string().optional()
  })
  .strict()
export type AutomationsChangedEvent = z.infer<typeof AutomationsChangedEvent>
