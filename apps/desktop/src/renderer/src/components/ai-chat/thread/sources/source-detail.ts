/**
 * 本轮来源 sheet 行：图标侧类型标只有文件 / 技能 / MCP，文档并进文件。
 */
import type { SourceKind, TurnSourceChip } from "./source-chip.ts"
import { displayBaseName, shortenSourcePath } from "./source-path.ts"

export type SourceBadgeKind = "file" | "skill" | "mcp" | "knowledge"

export function sourceBadgeKind(kind: SourceKind): SourceBadgeKind {
  if (kind === "skill") return "skill"
  if (kind === "mcp") return "mcp"
  if (kind === "knowledge") return "knowledge"
  return "file"
}

export function sourceRowName(chip: TurnSourceChip): string {
  if (chip.kind === "mcp") return chip.title?.trim() || displayBaseName(chip.path) || chip.label
  if (chip.kind === "skill") return skillRowName(chip)
  if (chip.kind === "doc" || chip.kind === "knowledge") {
    return chip.title?.trim() || displayBaseName(chip.path) || chip.label
  }
  return displayBaseName(chip.path) || chip.title?.trim() || chip.label
}

export function sourceRowProvenance(
  chip: TurnSourceChip,
  mcpPrefix: (name: string) => string
): string {
  if (chip.kind === "mcp") {
    const name = chip.title?.trim() || displayBaseName(chip.path) || chip.label
    return mcpPrefix(name)
  }
  const path = chip.path?.trim()
  if (!path) return ""
  const short = shortenSourcePath(path)
  if (chip.kind !== "skill" && chip.startLine != null) return `${short} · L${chip.startLine}`
  return short
}

export function canFocusSourceRow(chip: TurnSourceChip): boolean {
  return sourceBadgeKind(chip.kind) === "file" && Boolean(chip.path?.trim())
}

function skillRowName(chip: TurnSourceChip): string {
  const stripped = chip.title?.replace(/^技能\s*[·.]\s*/, "").replace(/^skill\s*[·.]\s*/i, "")
  return stripped?.trim() || displayBaseName(chip.path) || chip.title || chip.label
}
