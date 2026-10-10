/**
 * 点 sheet 行：工作区文件走 openChangedFile（可滚到行）；找不到则展开片段。
 */
import { getIde } from "@renderer/lib/ide"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { planSourceRowClick } from "./source-row-action.ts"
import { useSourceFileReveal } from "./source-file-reveal.ts"
import type { TurnSourceChip } from "./source-chip.ts"

export type OpenSourceRowResult = "opened" | "expand" | "none"

export async function openSourceRow(chip: TurnSourceChip): Promise<OpenSourceRowResult> {
  const exists = await workspaceFileExists(chip.path)
  const plan = planSourceRowClick(chip, exists)
  if (plan.action === "open") {
    if (plan.startLine != null) {
      useSourceFileReveal.getState().setReveal({ path: plan.path, line: plan.startLine })
    }
    await openChangedFile(plan.path)
    return "opened"
  }
  return plan.action
}

async function workspaceFileExists(path?: string): Promise<boolean> {
  const workspaceId = useChatStore.getState().workspaceId
  const rel = path?.trim()
  if (!workspaceId || !rel) return false
  try {
    const res = (await getIde().workspace.readFile({ workspaceId, path: rel })) as string
    return typeof res === "string"
  } catch {
    return false
  }
}
