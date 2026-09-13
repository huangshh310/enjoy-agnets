/**
 * Composer @ / 面板条目：文件 / 文档 / 技能 / MCP；斜杠是压缩与探索/执行。
 */
import type { ComposerSurface, ComposerVisibleMode } from "../composer-mode.ts"

export type SkillMention = {
  id: string
  name: string
  /** 合法斜杠呼号，名称带空格则为 null。 */
  slash: string | null
  scope: "workspace" | "global"
  description?: string
  relPath?: string
}

export type FileMentionItem = {
  kind: "file"
  id: string
  path: string
  name: string
  entryKind: "file" | "directory"
}

export type ModeMentionItem = {
  kind: "mode"
  id: string
  mode: ComposerVisibleMode
  /** C 端斜杠呼号：explore / execute，不把 ask|plan|agent 摊出来。 */
  slash: ComposerSurface
  label: string
  description: string
  /** 与 /compact 同组的来源胶囊，缺省回落到 label。 */
  tag?: string
}

export type DocMentionItem = {
  kind: "doc"
  id: string
  docId: string
  path: string
  name: string
}

export type WebMentionItem = {
  kind: "web"
  id: "web:disabled"
  muted: true
}

export type SkillMentionItem = {
  kind: "skill"
  id: string
  skill: SkillMention
}

/** 宿主内置命令：压缩会话等，选中后立刻执行，不发给模型。 */
export type CommandMentionItem = {
  kind: "command"
  id: string
  name: string
  description: string
  tag: string
}

export type McpMentionItem = {
  kind: "mcp"
  id: string
  name: string
  status?: string
  description?: string
}

export type MentionItem =
  | FileMentionItem
  | DocMentionItem
  | WebMentionItem
  | ModeMentionItem
  | SkillMentionItem
  | CommandMentionItem
  | McpMentionItem

const SLASH_SAFE = /^[A-Za-z][\w.-]*$/

/** 技能呼号：优先 trigger，否则把名称收成 slug；非法则没有 / 前缀。 */
export function skillSlashToken(skill: { name: string; trigger?: string }): string | null {
  const raw = (skill.trigger?.trim() || slugSkillName(skill.name)).replace(/^\/+/, "")
  if (!raw || !SLASH_SAFE.test(raw)) return null
  return raw
}

export function slugSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-")
}

export function filterMentionItems(items: readonly MentionItem[], query: string): MentionItem[] {
  const needle = query.trim().toLowerCase().replace(/^[/]+/, "")
  if (!needle) return [...items]
  return items.filter((item) => mentionHaystack(item).includes(needle))
}

function mentionHaystack(item: MentionItem): string {
  if (item.kind === "file") return `${item.name} ${item.path}`.toLowerCase()
  if (item.kind === "doc") return `${item.name} ${item.path}`.toLowerCase()
  if (item.kind === "web") return "web 网页 browser"
  if (item.kind === "mode") {
    return `${item.slash} ${item.label} ${item.description} ${item.tag ?? ""}`.toLowerCase()
  }
  if (item.kind === "command") return `${item.name} ${item.description}`.toLowerCase()
  if (item.kind === "mcp") return `mcp ${item.name} ${item.description ?? ""}`.toLowerCase()
  const skill = item.skill
  return `${skill.slash ?? ""} ${skill.name} ${skill.description ?? ""}`.toLowerCase()
}
