/**
 * 提示收藏薄库 · 本机 settings。
 * key = composer.prompt-library（≠ composer.presets）。
 * list safeParse 丢坏行；soft cap；星标优先保留；禁 strip-then-save。
 */
import {
  PromptLibraryEntry,
  PROMPT_LIBRARY_SOFT_CAP,
  normalizePromptLibraryText,
  type SavePromptLibraryEntryInput
} from "@enjoy-agents/ipc-contract"
import { getSetting, setSetting } from "./database"
import { createId } from "./ids"

const KEY = "composer.prompt-library"
const MAX_ENTRIES = PROMPT_LIBRARY_SOFT_CAP

export function listPromptLibrary(): PromptLibraryEntry[] {
  const raw = getSetting(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const row = PromptLibraryEntry.safeParse(item)
      return row.success ? [row.data] : []
    })
  } catch {
    return []
  }
}

export function savePromptLibraryEntry(input: SavePromptLibraryEntryInput): PromptLibraryEntry[] {
  const text = normalizePromptLibraryText(input.text)
  if (!text) return listPromptLibrary()
  const now = Date.now()
  const current = listPromptLibrary()
  const id = input.id ?? createId("pl")
  const existing = current.find((item) => item.id === id)
  const next = PromptLibraryEntry.parse({
    id,
    text,
    starred: input.starred,
    updatedAt: input.updatedAt ?? now,
    createdAt: input.createdAt ?? existing?.createdAt ?? now
  })
  const without = current.filter((item) => item.id !== id && item.text !== text)
  const merged = [next, ...without]
  const saved = capPromptLibrary(merged)
  setSetting(KEY, JSON.stringify(saved))
  return saved
}

/** 发送成功后 upsert「近期」：同文去重；已星标保留星；soft cap。 */
export function upsertRecentPrompt(text: string): PromptLibraryEntry[] {
  const normalized = normalizePromptLibraryText(text)
  if (!normalized) return listPromptLibrary()
  const current = listPromptLibrary()
  const existing = current.find((item) => item.text === normalized)
  const now = Date.now()
  if (existing) {
    const bumped = PromptLibraryEntry.parse({
      ...existing,
      updatedAt: now
    })
    const without = current.filter((item) => item.id !== existing.id)
    const saved = capPromptLibrary([bumped, ...without])
    setSetting(KEY, JSON.stringify(saved))
    return saved
  }
  const next = PromptLibraryEntry.parse({
    id: createId("pl"),
    text: normalized,
    starred: false,
    updatedAt: now,
    createdAt: now
  })
  const saved = capPromptLibrary([next, ...current])
  setSetting(KEY, JSON.stringify(saved))
  return saved
}

export function removePromptLibraryEntry(id: string): PromptLibraryEntry[] {
  const saved = listPromptLibrary().filter((item) => item.id !== id)
  setSetting(KEY, JSON.stringify(saved))
  return saved
}

/** 星标优先保留；其余按 updatedAt 近→远淘汰到 soft cap。 */
function capPromptLibrary(entries: PromptLibraryEntry[]): PromptLibraryEntry[] {
  if (entries.length <= MAX_ENTRIES) return entries
  const starred = entries.filter((item) => item.starred)
  const recent = entries
    .filter((item) => !item.starred)
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const room = Math.max(0, MAX_ENTRIES - starred.length)
  return [...starred, ...recent.slice(0, room)].sort((a, b) => b.updatedAt - a.updatedAt)
}
