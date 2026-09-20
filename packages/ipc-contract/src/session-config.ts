/**
 * ACP Session Config Options。思考档只认 category=thought_level。
 * 字段兼容 v1 `id` 与文档里的 `configId`。
 */
import { z } from "zod"

export const SessionConfigChoice = z.object({
  value: z.string().min(1).max(80),
  name: z.string().min(1).max(80)
})
export type SessionConfigChoice = z.infer<typeof SessionConfigChoice>

export const SessionConfigOption = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  category: z.string().max(40).optional(),
  type: z.enum(["select", "boolean"]).optional(),
  currentValue: z.union([z.string().max(80), z.boolean()]).optional(),
  choices: z.array(SessionConfigChoice).max(24)
})
export type SessionConfigOption = z.infer<typeof SessionConfigOption>

export const SetConfigOptionInput = z
  .object({
    sessionId: z.string().min(1),
    configId: z.string().min(1).max(80),
    value: z.string().min(1).max(80)
  })
  .strict()
export type SetConfigOptionInput = z.infer<typeof SetConfigOptionInput>

export const SetConfigOptionResult = z.object({
  ok: z.boolean(),
  pending: z.boolean().optional(),
  configOptions: z.array(SessionConfigOption).optional()
})
export type SetConfigOptionResult = z.infer<typeof SetConfigOptionResult>

const THOUGHT_IDS = new Set(["effort", "reasoning_effort", "thought_level"])

/** 广告表里的思考档：优先 category，其次常见 id。不足两档则没有可选项。 */
export function thoughtLevelOption(
  options: readonly SessionConfigOption[] | undefined
): SessionConfigOption | undefined {
  const rows = options ?? []
  const byCat = rows.find((item) => item.category === "thought_level")
  if (byCat && byCat.choices.length >= 2) return byCat
  const byId = rows.find((item) => THOUGHT_IDS.has(item.id) && item.choices.length >= 2)
  return byId
}
