/**
 * 本轮来源芯片：file / doc / skill / mcp 人话标签。密度锁 3–4 +N。
 */
import { displayBaseName, shortenSourcePath } from "./source-path.ts"

export type SourceKind = "file" | "doc" | "skill" | "mcp"

export type TurnSourceChip = {
  id: string
  kind: SourceKind
  label: string
  path?: string
  startLine?: number
  title?: string
}

export const SOURCE_CHIP_VISIBLE = 4

const CODE_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|c|cc|cpp|h|hpp|css|scss|json|toml|yaml|yml|vue|svelte|swift|rb)$/i

export function classifySourceKind(input: {
  path?: string
  title?: string
  toolName?: string
}): SourceKind {
  const path = (input.path ?? "").replaceAll("\\", "/")
  const title = input.title ?? ""
  const tool = (input.toolName ?? "").toLowerCase()
  if (tool.startsWith("mcp_") || tool === "mcp") return "mcp"
  if (tool === "skill" || /skill\.md$/i.test(path) || /(^|\/)skills\//i.test(path)) return "skill"
  if (title.startsWith("技能") || /^skill\b/i.test(title)) return "skill"
  if (!CODE_EXT.test(path) && (/\.(md|mdx|txt|markdown)$/i.test(path) || (!path.includes(".") && title))) {
    return "doc"
  }
  return "file"
}

/** `mcp_{server}__{tool}` → server。对不上则不当 MCP。 */
export function parseMcpServerId(toolName: string): string | null {
  const match = /^mcp_(.+?)__(.+)$/i.exec(toolName.trim())
  return match?.[1] ? match[1] : null
}

export function formatSourceChipLabel(
  chip: Pick<TurnSourceChip, "kind" | "path" | "startLine" | "title">,
  skillPrefix: (name: string) => string
): string {
  if (chip.kind === "mcp") return chip.title?.trim() || displayBaseName(chip.path) || "mcp"
  if (chip.kind === "skill") {
    const name = chip.title?.replace(/^技能\s*[·.]\s*/, "") || displayBaseName(chip.path) || chip.title || "skill"
    return skillPrefix(name)
  }
  if (chip.kind === "doc") return chip.title?.trim() || displayBaseName(chip.path) || chip.path || ""
  const file = chip.path || chip.title || ""
  const short = shortenSourcePath(file)
  return chip.startLine != null ? `${short} · L${chip.startLine}` : short
}

export function splitVisibleSourceChips<T>(chips: readonly T[], visible = SOURCE_CHIP_VISIBLE): {
  shown: T[]
  rest: number
} {
  if (chips.length <= visible) return { shown: [...chips], rest: 0 }
  return { shown: chips.slice(0, visible), rest: chips.length - visible }
}
