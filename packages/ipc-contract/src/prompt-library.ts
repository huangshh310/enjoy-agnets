/**
 * 提示收藏薄库：自由提示历史 / 星标。
 * 独立 key = composer.prompt-library（≠ composer.presets）。
 * 条目仅正文元数据；禁授权 / 名单 / 密钥字段 fail-closed。
 */
import { z } from "zod"

/** 允许键白名单（Must×1 fail-closed · 禁授权/名单/密钥）。 */
export const PROMPT_LIBRARY_ALLOWED_KEYS = [
  "id",
  "text",
  "starred",
  "updatedAt",
  "createdAt"
] as const

/**
 * 禁键名（出现即拒 · 靠 .strict() + 不变式；禁 strip-then-save 洗白）。
 * 独立常量，勿绑死 COMPOSER_PRESET_*。
 */
export const PROMPT_LIBRARY_FORBIDDEN_KEYS = [
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
  "mcpAllowed",
  "runtimeId",
  "modelId",
  "surface",
  "desktopBias"
] as const

export const PROMPT_LIBRARY_TEXT_MAX = 4000
export const PROMPT_LIBRARY_SOFT_CAP = 100

export const PromptLibraryEntry = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(PROMPT_LIBRARY_TEXT_MAX),
    starred: z.boolean(),
    updatedAt: z.number().int().positive(),
    createdAt: z.number().int().positive().optional()
  })
  .strict()
export type PromptLibraryEntry = z.infer<typeof PromptLibraryEntry>

export const SavePromptLibraryEntryInput = PromptLibraryEntry.omit({ id: true, updatedAt: true }).extend({
  id: z.string().min(1).optional(),
  updatedAt: z.number().int().positive().optional()
})
export type SavePromptLibraryEntryInput = z.infer<typeof SavePromptLibraryEntryInput>

export const RemovePromptLibraryEntryInput = z
  .object({
    id: z.string().min(1)
  })
  .strict()
export type RemovePromptLibraryEntryInput = z.infer<typeof RemovePromptLibraryEntryInput>

/** 空/空白视为无效；超长截断到上限。 */
export function normalizePromptLibraryText(value: string | undefined | null): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, PROMPT_LIBRARY_TEXT_MAX) : undefined
}
