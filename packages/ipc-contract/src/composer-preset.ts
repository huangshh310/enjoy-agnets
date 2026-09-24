/**
 * 启动预设：一次套上引擎、模型、探索/执行和思考档。
 * 只改当前 Composer，不改已经在跑的那一轮。
 */
import { z } from "zod"

export const ComposerPresetSurface = z.enum(["explore", "execute"])
export type ComposerPresetSurface = z.infer<typeof ComposerPresetSurface>

export const ComposerPreset = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(40),
    note: z.string().max(200).default(""),
    runtimeId: z.string().min(1),
    modelId: z.string().max(200).default(""),
    surface: ComposerPresetSurface,
    reasoningEffort: z.enum(["low", "medium", "high", "xhigh"]).optional(),
    acpThoughtLevel: z.string().max(80).optional()
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
