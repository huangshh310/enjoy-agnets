/**
 * 有正文、知识 Chip 或引用 Chip 都算有草稿，避免只引用时底栏误出 Stop。
 */
import { useSyncExternalStore } from "react"
import { listQuotedContexts, subscribeQuotedContexts } from "../quoted-context"
import { listSessionContextChips, subscribeSessionContextChips } from "../session-context-chips"
import {
  listComposerSkillChips,
  subscribeComposerSkillChips
} from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"

export function useComposerHasDraft(composer: string): boolean {
  const chipCount = useSyncExternalStore(
    subscribeSessionContextChips,
    () => listSessionContextChips().length,
    () => 0
  )
  const quoteCount = useSyncExternalStore(
    subscribeQuotedContexts,
    () => listQuotedContexts().length,
    () => 0
  )
  const skillCount = useSyncExternalStore(
    subscribeComposerSkillChips,
    () => listComposerSkillChips().length,
    () => 0
  )
  return Boolean(composer.trim()) || chipCount > 0 || quoteCount > 0 || skillCount > 0
}
