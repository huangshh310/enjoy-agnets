/**
 * 本轮来源类型标：图标与词条。缺 kind 时回落问号标，禁止抛错白屏。
 */
import { createElement, type ComponentType, type ReactElement } from "react"
import { RiBookOpenLine, RiFileTextLine, RiQuestionLine, RiSparklingLine } from "@remixicon/react"
import { McpIcon } from "../../../mcp/components/mcp-brand-icons.ts"
import type { SourceBadgeKind } from "./source-detail.ts"

export type SourceBadgeIcon = ComponentType<{ className?: string }>

export const SOURCE_BADGE_ICONS = {
  file: RiFileTextLine,
  skill: RiSparklingLine,
  mcp: McpIcon,
  knowledge: RiBookOpenLine
} as const satisfies Record<SourceBadgeKind, SourceBadgeIcon>

export const SOURCE_BADGE_FALLBACK_ICON: SourceBadgeIcon = RiQuestionLine

export const SOURCE_BADGE_LABEL_KEYS = {
  file: "chat.sourcesSheetKindFile",
  skill: "chat.sourcesSheetKindSkill",
  mcp: "chat.sourcesSheetKindMcp",
  knowledge: "chat.sourceKnowledgeLabel"
} as const satisfies Record<SourceBadgeKind, string>

export const SOURCE_BADGE_KINDS = Object.keys(SOURCE_BADGE_ICONS) as SourceBadgeKind[]

/** 已知 kind 走表；未知 kind 回落问号，永不 throw。 */
export function sourceBadgeIcon(kind: string): SourceBadgeIcon {
  if (Object.hasOwn(SOURCE_BADGE_ICONS, kind)) {
    return SOURCE_BADGE_ICONS[kind as SourceBadgeKind]
  }
  return SOURCE_BADGE_FALLBACK_ICON
}

export function sourceBadgeLabelKey(kind: string): string {
  if (Object.hasOwn(SOURCE_BADGE_LABEL_KEYS, kind)) {
    return SOURCE_BADGE_LABEL_KEYS[kind as SourceBadgeKind]
  }
  return SOURCE_BADGE_LABEL_KEYS.file
}

/** 给单测走 renderToStaticMarkup：每种 kind 都能画出一行，缺图标也不崩。 */
export function renderSourceBadgeRow(
  kind: string,
  t: (key: string) => string
): ReactElement {
  const Icon = sourceBadgeIcon(kind)
  return createElement(
    "div",
    { "data-testid": "turn-source-row", "data-kind": kind },
    createElement(Icon, { className: "size-3.5" }),
    createElement("span", null, t(sourceBadgeLabelKey(kind)))
  )
}
