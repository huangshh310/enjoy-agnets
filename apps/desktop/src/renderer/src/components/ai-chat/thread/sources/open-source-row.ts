/**
 * 点 sheet 行：只读 / 知识库打开文件栏查看文件；本轮写过且 git 才走审查差异。找不到则展开片段。
 */
import { getIde } from "@renderer/lib/ide"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { pathsFromLastTurn } from "../../right-pane/views/review/last-turn-paths.ts"
import { planSourceRowClick, resolveSourceOpenView } from "./source-row-action.ts"
import { useSourceFileReveal } from "./source-file-reveal.ts"
import type { TurnSourceChip } from "./source-chip.ts"

export type OpenSourceRowResult = "opened" | "expand" | "none"

export async function openSourceRow(chip: TurnSourceChip): Promise<OpenSourceRowResult> {
  const exists = await workspaceFileExists(chip.path)
  const thisTurn = pathsFromLastTurn(useChatStore.getState().messages)
  const plan = planSourceRowClick(chip, exists, thisTurn)
  if (plan.action === "open") {
    const view = resolveSourceOpenView(plan.view, useChatStore.getState().gitRepo)
    useSourceFileReveal.getState().setReveal({
      path: plan.path,
      line: plan.startLine ?? 1,
      view
    })
    await openChangedFile(plan.path, { reveal: view === "preview" ? "files" : "review" })
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
