/**
 * 按当前 token 拼面板条目。
 * @：文件 / 文档 / 技能 / MCP，网页 muted。/：compact + 探索/执行 + 技能。
 */
import { modeForSurface, type ComposerSurface } from "../composer-mode.ts"
import type { MentionDirEntry } from "./collect-mention-files.ts"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { listKnownSkills } from "./composer-skill-chips.ts"
import { DESKTOP_HOST_TOKEN } from "./desktop/constants.ts"
import {
  filterMentionItems,
  type DesktopMentionItem,
  type McpMentionItem,
  type MentionItem,
  type ModeMentionItem,
  type SkillMention
} from "./mention-items.ts"

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
  docs: readonly MentionDoc[] = [],
  mcps: readonly McpMentionItem[] = [],
  skills: readonly SkillMention[] = listKnownSkills(),
  desktopEnabled = false,
  desktopApps: readonly DesktopMentionApp[] = []
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
  const skillItems: MentionItem[] = skills.map((skill) => ({
    kind: "skill" as const,
    id: `skill:${skill.id}`,
    skill
  }))
  const mcpItems: MentionItem[] = mcps.map((mcp) => ({
    kind: "mcp" as const,
    id: mcp.id,
    name: mcp.name,
    status: mcp.status,
    description: mcp.description
  }))
  const desktopItems: MentionItem[] = desktopEnabled ? buildDesktopMentionItems(desktopApps) : []
  const live = filterMentionItems([...desktopItems, ...fileItems, ...docItems, ...skillItems, ...mcpItems], query)
  const querying = Boolean(query.trim())
  const capped = querying ? live.slice(0, VISIBLE_LIMIT) : capEmptyAtMentions(live)
  const web = filterMentionItems([MUTED_WEB], query)
  return [...capped, ...web]
}

/** 空 @ 每类最多 4 条，避免一排刷满。桌面宿主 + 有限应用。 */
function capEmptyAtMentions(items: readonly MentionItem[]): MentionItem[] {
  const desktop = capDesktopMentions(items)
  const files = items.filter((item) => item.kind === "file").slice(0, AT_KIND_LIMIT)
  const docs = items.filter((item) => item.kind === "doc").slice(0, AT_KIND_LIMIT)
  const skills = items.filter((item) => item.kind === "skill").slice(0, AT_KIND_LIMIT)
  const mcps = items.filter((item) => item.kind === "mcp").slice(0, AT_KIND_LIMIT)
  return [...desktop, ...files, ...docs, ...skills, ...mcps]
}

const EMPTY_APP_LIMIT = 6

function buildDesktopMentionItems(apps: readonly DesktopMentionApp[]): MentionItem[] {
  const host: DesktopMentionItem = {
    kind: "desktop",
    id: "desktop:host",
    role: "host",
    label: DESKTOP_HOST_TOKEN,
    displayName: DESKTOP_HOST_TOKEN,
    token: DESKTOP_HOST_TOKEN,
    appKey: "",
    stable: true
  }
  const listed = apps.map((app) => desktopAppItem(app))
  return [host, ...listed]
}

function desktopAppItem(app: DesktopMentionApp): DesktopMentionItem {
  const token = app.displayName.trim() || app.appKey || `pid-${app.pid ?? 0}`
  return {
    kind: "desktop",
    id: app.stable && app.appKey ? `desktop:app:${app.appKey}` : `desktop:pid:${app.pid ?? token}`,
    role: "app",
    label: app.displayName,
    displayName: app.displayName,
    token,
    appKey: app.appKey,
    stable: app.stable,
    pid: app.pid
  }
}

/** 空 @ 桌面组：宿主 + 有限应用，避免刷满。 */
function capDesktopMentions(items: readonly MentionItem[]): MentionItem[] {
  const desktop = items.filter((item) => item.kind === "desktop")
  const host = desktop.filter((item) => item.kind === "desktop" && item.role === "host")
  const apps = desktop.filter((item) => item.kind === "desktop" && item.role === "app").slice(0, EMPTY_APP_LIMIT)
  return [...host, ...apps]
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
