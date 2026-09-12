/**
 * 点 sheet 文件行：有 path 才聚焦审查。技能 / MCP 不编造跳转。
 */
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { canFocusSourceRow } from "./source-detail.ts"
import type { TurnSourceChip } from "./source-chip.ts"

export function openSourceRow(chip: TurnSourceChip): void {
  if (!canFocusSourceRow(chip) || !chip.path) return
  void openChangedFile(chip.path)
}
