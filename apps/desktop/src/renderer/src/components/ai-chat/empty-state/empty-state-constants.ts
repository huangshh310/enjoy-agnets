/**
 * 空态示例任务：3 条短 pill，不是营销口号。
 */
import { RiCodeSSlashLine, RiFlaskLine, RiGitPullRequestLine } from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import type { EmptyStateIntentItem } from "./empty-state.types"

const INTENT_DEFS = [
  {
    id: "git-review",
    icon: RiGitPullRequestLine,
    title: "chat.intentGitTitle",
    shortTitle: "chat.intentGitShort",
    description: "chat.intentGitDesc",
    tag: "chat.intentGitTag",
    prompt: "chat.intentGitPrompt"
  },
  {
    id: "unit-test",
    icon: RiFlaskLine,
    title: "chat.intentTestTitle",
    shortTitle: "chat.intentTestShort",
    description: "chat.intentTestDesc",
    tag: "chat.intentTestTag",
    prompt: "chat.intentTestPrompt"
  },
  {
    id: "refactor-clean",
    icon: RiCodeSSlashLine,
    title: "chat.intentRefactorTitle",
    shortTitle: "chat.intentRefactorShort",
    description: "chat.intentRefactorDesc",
    tag: "chat.intentRefactorTag",
    prompt: "chat.intentRefactorPrompt"
  }
] as const

export function getIntentCards(t: TranslateFn): EmptyStateIntentItem[] {
  return INTENT_DEFS.map((item) => ({
    id: item.id,
    icon: item.icon,
    title: t(item.title),
    shortTitle: t(item.shortTitle),
    description: t(item.description),
    tag: t(item.tag),
    prompt: t(item.prompt)
  }))
}
