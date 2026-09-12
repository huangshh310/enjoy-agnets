/**
 * 点芯片打开已有审查 / 知识 / 技能页，不弹 citation 抽屉。
 */
import { knowledgeSearchFromSource } from "@renderer/components/knowledge/lib/knowledge-route-search"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import type { TurnSourceChip } from "./source-chip"

export async function openSourceChip(
  chip: TurnSourceChip,
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => unknown
) {
  if (chip.kind === "skill") {
    await navigate({ to: "/skills" })
    return
  }
  if (chip.kind === "doc") {
    await navigate({
      to: "/knowledge",
      search: knowledgeSearchFromSource({
        path: chip.path ?? chip.title ?? "",
        title: chip.title,
        startLine: chip.startLine
      })
    })
    return
  }
  if (chip.path) void openChangedFile(chip.path)
}
