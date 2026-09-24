/**
 * 会话心跳：cron 到点向同一条会话发一句。空闲才发，关闭应用即停。
 */
import { z } from "zod"

export const SessionHeartbeat = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    cronExpr: z.string(),
    timeZone: z.string(),
    prompt: z.string(),
    maxRuns: z.number().int().positive().nullable(),
    runCount: z.number().int().nonnegative(),
    enabled: z.boolean(),
    lastRunAt: z.number().int().nullable()
  })
  .strict()
export type SessionHeartbeat = z.infer<typeof SessionHeartbeat>

export const SessionHeartbeatGetInput = z
  .object({
    sessionId: z.string().min(1)
  })
  .strict()
export type SessionHeartbeatGetInput = z.infer<typeof SessionHeartbeatGetInput>

export const SessionHeartbeatPutInput = z
  .object({
    sessionId: z.string().min(1),
    cronExpr: z.string().min(1).max(80),
    timeZone: z.string().min(1).max(80).optional(),
    prompt: z.string().min(1).max(4000),
    maxRuns: z.number().int().positive().max(1000).nullable().optional()
  })
  .strict()
export type SessionHeartbeatPutInput = z.infer<typeof SessionHeartbeatPutInput>

export const SessionHeartbeatClearInput = SessionHeartbeatGetInput
export type SessionHeartbeatClearInput = z.infer<typeof SessionHeartbeatClearInput>
