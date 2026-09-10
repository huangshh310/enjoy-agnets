/**
 * @ / 面板分组：文件一组；斜杠按内置命令 / 工作区技能 / 个人技能切开。
 */
import type { MentionItem } from "./mention-items.ts"

export type MentionGroupId = "files" | "builtin" | "workspace" | "personal"

export type MentionGroup = {
  id: MentionGroupId
  items: MentionItem[]
}

export function groupMentionItems(kind: "at" | "slash", items: readonly MentionItem[]): MentionGroup[] {
  if (kind === "at") return items.length > 0 ? [{ id: "files", items: [...items] }] : []
  const groups: MentionGroup[] = []
  const builtin = items.filter((item) => item.kind === "command" || item.kind === "mode")
  const workspace = items.filter((item) => item.kind === "skill" && item.skill.scope === "workspace")
  const personal = items.filter((item) => item.kind === "skill" && item.skill.scope === "global")
  if (builtin.length > 0) groups.push({ id: "builtin", items: builtin })
  if (workspace.length > 0) groups.push({ id: "workspace", items: workspace })
  if (personal.length > 0) groups.push({ id: "personal", items: personal })
  return groups
}
