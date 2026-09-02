/**
 * 会话空状态：图标与 id 固定，文案走 i18n。
 */
import {
  RiCodeSSlashLine,
  RiFlaskLine,
  RiGitPullRequestLine,
  RiStackLine
} from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import type { EmptyStateIntentItem, EmptyStateShortcutPill } from "./empty-state.types"

const INTENT_DEFS = [
  {
    id: "git-review",
    icon: RiGitPullRequestLine,
    iconColor: "text-emerald-500 group-hover:text-emerald-500 dark:text-emerald-400",
    title: "chat.intentGitTitle",
    shortTitle: "chat.intentGitShort",
    description: "chat.intentGitDesc",
    tag: "chat.intentGitTag",
    prompt: "chat.intentGitPrompt"
  },
  {
    id: "arch-explain",
    icon: RiStackLine,
    iconColor: "text-indigo-500 group-hover:text-indigo-500 dark:text-indigo-400",
    title: "chat.intentArchTitle",
    shortTitle: "chat.intentArchShort",
    description: "chat.intentArchDesc",
    tag: "chat.intentArchTag",
    prompt: "chat.intentArchPrompt"
  },
  {
    id: "unit-test",
    icon: RiFlaskLine,
    iconColor: "text-amber-500 group-hover:text-amber-500 dark:text-amber-400",
    title: "chat.intentTestTitle",
    shortTitle: "chat.intentTestShort",
    description: "chat.intentTestDesc",
    tag: "chat.intentTestTag",
    prompt: "chat.intentTestPrompt"
  },
  {
    id: "refactor-clean",
    icon: RiCodeSSlashLine,
    iconColor: "text-sky-500 group-hover:text-sky-500 dark:text-sky-400",
    title: "chat.intentRefactorTitle",
    shortTitle: "chat.intentRefactorShort",
    description: "chat.intentRefactorDesc",
    tag: "chat.intentRefactorTag",
    prompt: "chat.intentRefactorPrompt"
  }
] as const

const PILL_DEFS = [
  { id: "mention-file", keyHint: "@", label: "chat.emptyMention", description: "chat.pillMentionDesc" },
  { id: "slash-action", keyHint: "/", label: "chat.emptySlash", description: "chat.pillSlashDesc" },
  { id: "quick-search", keyHint: "⌘L", label: "chat.emptySearch", description: "chat.pillSearchDesc" }
] as const

export function getIntentCards(t: TranslateFn): EmptyStateIntentItem[] {
  return INTENT_DEFS.map((item) => ({
    id: item.id,
    icon: item.icon,
    iconColor: item.iconColor,
    title: t(item.title),
    shortTitle: t(item.shortTitle),
    description: t(item.description),
    tag: t(item.tag),
    prompt: t(item.prompt)
  }))
}

export function getShortcutPills(t: TranslateFn): EmptyStateShortcutPill[] {
  return PILL_DEFS.map((item) => ({
    id: item.id,
    keyHint: item.keyHint,
    label: t(item.label),
    description: t(item.description)
  }))
}
