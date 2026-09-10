/**
 * 按当前 token 拼面板条目。空 @ 只给根目录；有查询才扁平过滤。
 */
import { COMPOSER_VISIBLE_MODES, type ComposerVisibleMode } from "../composer-mode.ts"
import type { MentionDirEntry } from "./collect-mention-files.ts"
import { listKnownSkills } from "./composer-skill-chips.ts"
import { filterMentionItems, type MentionItem, type ModeMentionItem } from "./mention-items.ts"

export type ModeCopy = Record<ComposerVisibleMode, { label: string; description: string }>

export type SlashBuiltinCopy = {
  compactDescription: string
  builtinTag: string
}

const VISIBLE_LIMIT = 40

export function buildAtMentionItems(
  query: string,
  roots: readonly MentionDirEntry[],
  files: readonly MentionDirEntry[]
): MentionItem[] {
  const source = query.trim() ? files : roots
  const items: MentionItem[] = source.map((entry) => ({
    kind: "file",
    id: `file:${entry.path}`,
    path: entry.path,
    name: entry.name,
    entryKind: entry.kind
  }))
  return filterMentionItems(items, query).slice(0, VISIBLE_LIMIT)
}

/** 斜杠内置组：压缩靠前，规划/问答比默认智能体更显眼。 */
const SLASH_MODE_ORDER: ComposerVisibleMode[] = ["plan", "ask", "debug", "agent"]

export function buildSlashMentionItems(
  query: string,
  copy: ModeCopy,
  builtin: SlashBuiltinCopy
): MentionItem[] {
  const compact: MentionItem = {
    kind: "command",
    id: "command:compact",
    name: "compact",
    description: builtin.compactDescription,
    tag: builtin.builtinTag
  }
  const modes: ModeMentionItem[] = SLASH_MODE_ORDER.filter((mode) =>
    COMPOSER_VISIBLE_MODES.includes(mode)
  ).map((mode) => ({
    kind: "mode",
    id: `mode:${mode}`,
    mode,
    label: copy[mode].label,
    description: copy[mode].description,
    tag: builtin.builtinTag
  }))
  const skills: MentionItem[] = listKnownSkills().map((skill) => ({
    kind: "skill" as const,
    id: `skill:${skill.id}`,
    skill
  }))
  return filterMentionItems([compact, ...modes, ...skills], query).slice(0, VISIBLE_LIMIT)
}
