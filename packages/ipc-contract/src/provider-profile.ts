/**
 * 供应商档案的对外形状：三条端点、多把 Key、检测与开关。
 * 明文 Key 不进这些 schema 的回包。
 */
import { z } from "zod"
import { ReasoningEffort as ReasoningEffortSchema } from "./reasoning-effort"

export const WireApiStyle = z.enum(["openai", "anthropic", "openai-responses"])
export type WireApiStyle = z.infer<typeof WireApiStyle>

export const ProviderEndpointsInput = z
  .object({
    openai: z.string().optional(),
    anthropic: z.string().optional(),
    "openai-responses": z.string().optional()
  })
  .strict()
export type ProviderEndpointsInput = z.infer<typeof ProviderEndpointsInput>

/** 保存时 apiKey 空字符串表示保留 vault 里同一 id 的旧值。 */
export const ProviderKeyInput = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  apiKey: z.string().optional(),
  apiStyle: WireApiStyle.optional(),
  enabled: z.boolean().optional()
})
export type ProviderKeyInput = z.infer<typeof ProviderKeyInput>

export const ProviderKeyPublic = z.object({
  id: z.string(),
  name: z.string(),
  hasKey: z.boolean(),
  keyHint: z.string(),
  apiStyle: WireApiStyle.optional(),
  enabled: z.boolean()
})
export type ProviderKeyPublic = z.infer<typeof ProviderKeyPublic>

export const CatalogModelSource = z.enum(["preset", "remote", "manual"])
export type CatalogModelSource = z.infer<typeof CatalogModelSource>

export const ReasoningFamilyInput = z.enum(["auto", "minimax", "glm", "kimi", "deepseek", "default"])
export type ReasoningFamilyInput = z.infer<typeof ReasoningFamilyInput>

export const DetectProviderInput = z.object({
  id: z.string().optional(),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().min(1),
  modelId: z.string().optional(),
  customHeaders: z.string().optional()
})
export type DetectProviderInput = z.infer<typeof DetectProviderInput>

export const DetectProviderProbe = z.object({
  style: WireApiStyle,
  ok: z.boolean(),
  base: z.string(),
  message: z.string(),
  code: z.string()
})
export type DetectProviderProbe = z.infer<typeof DetectProviderProbe>

/** 名称由渲染进程带上本地化的「副本」，主进程只复制 vault。 */
export const DuplicateProviderInput = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1)
  })
  .strict()
export type DuplicateProviderInput = z.infer<typeof DuplicateProviderInput>

export const SetProviderEnabledInput = z
  .object({
    id: z.string().min(1),
    enabled: z.boolean()
  })
  .strict()
export type SetProviderEnabledInput = z.infer<typeof SetProviderEnabledInput>

export const ProviderModelItem = z.object({
  id: z.string(),
  label: z.string(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  source: CatalogModelSource.optional(),
  /** 用户填的每百万 token USD 单价；缺项未知，不要当 0。 */
  inputPricePerMillion: z.number().nonnegative().optional(),
  outputPricePerMillion: z.number().nonnegative().optional(),
  cacheReadPricePerMillion: z.number().nonnegative().optional(),
  cacheWritePricePerMillion: z.number().nonnegative().optional(),
  reasoningPricePerMillion: z.number().nonnegative().optional()
})
export type ProviderModelItem = z.infer<typeof ProviderModelItem>

/** 部分更新。endpoints 与 baseURL 同时出现时，主进程以 endpoints 为准。 */
export const UpsertProviderInput = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  kind: z.string().min(1),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  modelId: z.string().optional(),
  apiStyle: z.string().optional(),
  fastModelId: z.string().optional(),
  reasoningModelId: z.string().optional(),
  contextWindow: z.number().int().positive().nullable().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  reasoningEffort: ReasoningEffortSchema.optional(),
  customHeaders: z.string().optional(),
  customBody: z.string().optional(),
  models: z.array(ProviderModelItem).optional(),
  activate: z.boolean().optional(),
  endpoints: ProviderEndpointsInput.optional(),
  baseAPI: WireApiStyle.optional(),
  regionId: z.string().optional(),
  keys: z.array(ProviderKeyInput).optional(),
  enabled: z.boolean().optional(),
  modelsURL: z.string().optional(),
  reasoningFamily: ReasoningFamilyInput.optional(),
  proxy: z.string().optional()
})
export type UpsertProviderInput = z.infer<typeof UpsertProviderInput>
