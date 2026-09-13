/**
 * @ / 面板分组：发现（文件/文档/技能/MCP）；斜杠按内置 / 工作区 / 个人。
 */
import type { MentionItem } from "./mention-items.ts"

export type MentionGroupId = "discover" | "files" | "skills" | "mcp" | "builtin" | "workspace" | "personal"

export type MentionGroup = {
  id: MentionGroupId
  items: MentionItem[]
}

export function groupMentionItems(kind: "at" | "slash", items: readonly MentionItem[]): MentionGroup[] {
  if (kind === "at") {
    const live = items.filter((item) => item.kind !== "web")
    const web = items.filter((item) => item.kind === "web")
    const all = [...live, ...web]
    return all.length > 0 ? [{ id: "discover", items: all }] : []
  }
  const groups: MentionGroup[] = []
  const builtin = items.filter((item) => item.kind === "command" || item.kind === "mode")
  const workspace = items.filter((item) => item.kind === "skill" && item.skill.scope === "workspace")
  const personal = items.filter((item) => item.kind === "skill" && item.skill.scope === "global")
  if (builtin.length > 0) groups.push({ id: "builtin", items: builtin })
  if (workspace.length > 0) groups.push({ id: "workspace", items: workspace })
  if (personal.length > 0) groups.push({ id: "personal", items: personal })
  return groups
}
