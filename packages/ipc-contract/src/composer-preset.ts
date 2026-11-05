/**
 * 启动预设：一次套上引擎、模型、探索/执行和思考档。
 * 可选提示词草稿 + 可选桌面叙事偏置（非授权）。
 * 只改当前 Composer，不改已经在跑的那一轮。
 */
import { z } from "zod"

export const ComposerPresetSurface = z.enum(["explore", "execute"])
export type ComposerPresetSurface = z.infer<typeof ComposerPresetSurface>

/** 允许键白名单（Must×2 fail-closed · 禁授权/名单/密钥）。 */
export const COMPOSER_PRESET_ALLOWED_KEYS = [
  "id",
  "name",
  "note",
  "runtimeId",
  "modelId",
  "surface",
  "reasoningEffort",
  "acpThoughtLevel",
  "promptTemplate",
  "desktopBias"
] as const

/** 禁键名（出现即拒 · 靠 .strict() + 不变式；禁 strip-then-save 洗白）。 */
export const COMPOSER_PRESET_FORBIDDEN_KEYS = [
  "alwaysAllow",
  "always_allow",
  "allowlist",
  "allowedTools",
  "allowed-tools",
  "approval",
  "approvals",
  "secret",
  "secrets",
  "apiKey",
  "token",
  "mcpAllow",
  "mcpAllowlist",
  "mcpAllowed"
] as const

export const ComposerPreset = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(40),
    note: z.string().max(200).default(""),
    runtimeId: z.string().min(1),
    modelId: z.string().max(200).default(""),
    surface: ComposerPresetSurface,
    reasoningEffort: z.enum(["low", "medium", "high", "xhigh"]).optional(),
    acpThoughtLevel: z.string().max(80).optional(),
    /** 可选提示词草稿；空串≈缺省；上限 4000。 */
    promptTemplate: z.string().max(4000).optional(),
    /**
     * 可选桌面叙事偏置（boolean）。
     * true = 「更倾向桌面操控」；缺省/false = 无叙事偏置。
     * 绝不是授权 / Always-allow / 提及联合体。
     */
    desktopBias: z.boolean().optional()
  })
  .strict()
export type ComposerPreset = z.infer<typeof ComposerPreset>

export const SaveComposerPresetInput = ComposerPreset.omit({ id: true }).extend({
  id: z.string().min(1).optional()
})
export type SaveComposerPresetInput = z.infer<typeof SaveComposerPresetInput>

export const RemoveComposerPresetInput = z
  .object({
    id: z.string().min(1)
  })
  .strict()
export type RemoveComposerPresetInput = z.infer<typeof RemoveComposerPresetInput>

/** 空提示词视为缺省（不写入 / 不套草稿）。 */
export function normalizePromptTemplate(value: string | undefined | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 4000) : undefined
}
