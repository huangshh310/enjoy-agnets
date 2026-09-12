/**
 * 按当前 token 拼面板条目。
 * @：文件 / 文档 / 技能，网页 muted。/：compact + 探索/执行 + 技能。
 */
import { modeForSurface, type ComposerSurface } from "../composer-mode.ts"
import type { MentionDirEntry } from "./collect-mention-files.ts"
import { listKnownSkills } from "./composer-skill-chips.ts"
import { filterMentionItems, type MentionItem, type ModeMentionItem } from "./mention-items.ts"

export type SurfaceCopy = Record<ComposerSurface, { label: string; description: string }>

export type SlashBuiltinCopy = {
  compactDescription: string
  builtinTag: string
}

export type MentionDoc = {
  id: string
  path: string
  name: string
}

const VISIBLE_LIMIT = 40
const AT_KIND_LIMIT = 4
const MUTED_WEB: MentionItem = { kind: "web", id: "web:disabled", muted: true }

export function buildAtMentionItems(
  query: string,
  roots: readonly MentionDirEntry[],
  files: readonly MentionDirEntry[],
  docs: readonly MentionDoc[] = []
): MentionItem[] {
  const fileSource = query.trim() ? files : roots
  const fileItems: MentionItem[] = fileSource.map((entry) => ({
    kind: "file",
    id: `file:${entry.path}`,
    path: entry.path,
    name: entry.name,
    entryKind: entry.kind
  }))
  const docItems: MentionItem[] = docs.map((doc) => ({
    kind: "doc",
    id: `doc:${doc.id}`,
    docId: doc.id,
    path: doc.path,
    name: doc.name
  }))
  const skillItems: MentionItem[] = listKnownSkills().map((skill) => ({
    kind: "skill" as const,
    id: `skill:${skill.id}`,
    skill
  }))
  const live = filterMentionItems([...fileItems, ...docItems, ...skillItems], query)
  const capped = query.trim() ? live.slice(0, VISIBLE_LIMIT) : capEmptyAtMentions(live)
  const web = filterMentionItems([MUTED_WEB], query)
  return [...capped, ...web]
}

/** 空 @ 每类最多 4 条，避免一排刷满。 */
function capEmptyAtMentions(items: readonly MentionItem[]): MentionItem[] {
  const files = items.filter((item) => item.kind === "file").slice(0, AT_KIND_LIMIT)
  const docs = items.filter((item) => item.kind === "doc").slice(0, AT_KIND_LIMIT)
  const skills = items.filter((item) => item.kind === "skill").slice(0, AT_KIND_LIMIT)
  return [...files, ...docs, ...skills]
}

const SLASH_SURFACES: ComposerSurface[] = ["explore", "execute"]

export function buildSlashMentionItems(
  query: string,
  copy: SurfaceCopy,
  builtin: SlashBuiltinCopy
): MentionItem[] {
  const compact: MentionItem = {
    kind: "command",
    id: "command:compact",
    name: "compact",
    description: builtin.compactDescription,
    tag: builtin.builtinTag
  }
  const modes: ModeMentionItem[] = SLASH_SURFACES.map((surface) => ({
    kind: "mode",
    id: `mode:${surface}`,
    mode: modeForSurface(surface),
    slash: surface,
    label: copy[surface].label,
    description: copy[surface].description,
    tag: builtin.builtinTag
  }))
  const skills: MentionItem[] = listKnownSkills().map((skill) => ({
    kind: "skill" as const,
    id: `skill:${skill.id}`,
    skill
  }))
  return filterMentionItems([compact, ...modes, ...skills], query).slice(0, VISIBLE_LIMIT)
}
