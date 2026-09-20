/**
 * Automations 列表、写入与立刻开一轮。
 * P0 触发落地：manual / cron；on_save 仍能解析旧数据，本刀 UI 不新做。
 */
import { z } from "zod"

/** 内部值；C 端只露探索/执行。与 AgentMode 的 plan/ask/agent 对齐。 */
export const AutomationMode = z.enum(["agent", "plan", "ask"])
export type AutomationMode = z.infer<typeof AutomationMode>

export const AutomationTrigger = z.enum(["manual", "on_save", "cron"])
export type AutomationTrigger = z.infer<typeof AutomationTrigger>

export const AutomationRunStatus = z.enum(["ok", "failed", "running"])
export type AutomationRunStatus = z.infer<typeof AutomationRunStatus>

export const Automation = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
  trigger: AutomationTrigger,
  cronExpr: z.string().optional(),
  timeZone: z.string().optional(),
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
  enabled: z.boolean(),
  updatedAt: z.number()
})
export type Automation = z.infer<typeof Automation>

export const UpsertAutomationInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  prompt: z.string(),
  trigger: AutomationTrigger,
  cronExpr: z.string().optional(),
  timeZone: z.string().optional(),
  runtimeId: z.string().optional(),
  modelId: z.string().optional(),
  mode: AutomationMode.optional(),
  stopOnFailCount: z.number().int().min(1).optional(),
  consecutiveFails: z.number().int().min(0).optional(),
  lastRunAt: z.number().optional(),
  lastRunStatus: AutomationRunStatus.optional(),
  lastSessionId: z.string().optional(),
  lastError: z.string().optional(),
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
    reason: z.enum(["upsert", "remove", "run", "status"]),
    id: z.string().optional()
  })
  .strict()
export type AutomationsChangedEvent = z.infer<typeof AutomationsChangedEvent>
