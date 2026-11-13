/**
 * 面板列表 = 本会话 listRecallPrompts ∪ 库内 starred（+ 库内近期）。
 * 客户端关键字滤；不做全库检索引擎。
 */
import type { PromptLibraryEntry } from "@enjoy-agents/ipc-contract"
import type { PromptLibraryRow } from "./prompt-library-types.ts"

export function mergePromptLibraryRows(input: {
  sessionPrompts: string[]
  library: PromptLibraryEntry[]
  query: string
}): { starred: PromptLibraryRow[]; recent: PromptLibraryRow[] } {
  const q = input.query.trim().toLowerCase()
  const byText = new Map<string, PromptLibraryRow>()

  for (const entry of input.library) {
    byText.set(entry.text, {
      id: entry.id,
      text: entry.text,
      starred: entry.starred,
      source: "library",
      updatedAt: entry.updatedAt
    })
  }

  for (const text of input.sessionPrompts) {
    const existing = byText.get(text)
    if (existing) continue
    byText.set(text, {
      id: `session:${hashText(text)}`,
      text,
      starred: false,
      source: "session"
    })
  }

  const all = [...byText.values()]
  const filtered = q
    ? all.filter((row) => row.text.toLowerCase().includes(q))
    : all

  const starred = filtered
    .filter((row) => row.starred)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const starredTexts = new Set(starred.map((row) => row.text))
  const recent = filtered
    .filter((row) => !starredTexts.has(row.text))
    .sort((a, b) => {
      // 会话召回已是近→远；库内按 updatedAt
      const ai = a.source === "session" ? input.sessionPrompts.indexOf(a.text) : -1
      const bi = b.source === "session" ? input.sessionPrompts.indexOf(b.text) : -1
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })

  return { starred, recent }
}

function hashText(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

export function filterPromptLibraryRows(
  rows: PromptLibraryRow[],
  query: string
): PromptLibraryRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => row.text.toLowerCase().includes(q))
}
