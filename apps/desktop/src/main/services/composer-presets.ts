/**
 * 启动预设存在本机 settings。最多 12 条。
 */
import {
  ComposerPreset,
  type SaveComposerPresetInput
} from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"
import { createId } from "./ids"

const KEY = "composer.presets"
const MAX_PRESETS = 12

export function listComposerPresets(): ComposerPreset[] {
  const raw = getSetting(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const row = ComposerPreset.safeParse(item)
      return row.success ? [row.data] : []
    })
  } catch {
    return []
  }
}

export function saveComposerPreset(input: SaveComposerPresetInput): ComposerPreset[] {
  const current = listComposerPresets()
  const id = input.id ?? createId("preset")
  const next = ComposerPreset.parse({ ...input, id, note: input.note ?? "" })
  const without = current.filter((item) => item.id !== id)
  const saved = [next, ...without].slice(0, MAX_PRESETS)
  setSetting(KEY, JSON.stringify(saved))
  return saved
}

export function removeComposerPreset(id: string): ComposerPreset[] {
  const saved = listComposerPresets().filter((item) => item.id !== id)
  setSetting(KEY, JSON.stringify(saved))
  return saved
}
