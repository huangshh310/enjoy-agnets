/**
 * 有正文、知识 Chip 或引用 Chip 都算有草稿，避免只引用时底栏误出 Stop。
 */
import { useSyncExternalStore } from "react"
import { subscribeComposerAssets } from "../composer-assets"
import { composerHasExtras } from "../composer-draft-extras"
import { composerCanSend } from "./composer-can-send"
import { subscribeQuotedContexts } from "../quoted-context"
import { subscribeSessionContextChips } from "../session-context-chips"
import { subscribeComposerSkillChips } from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"

export function useComposerHasDraft(composer: string): boolean {
  useSyncExternalStore(subscribeSessionContextChips, extrasSnapshot, extrasSnapshot)
  useSyncExternalStore(subscribeQuotedContexts, extrasSnapshot, extrasSnapshot)
  useSyncExternalStore(subscribeComposerSkillChips, extrasSnapshot, extrasSnapshot)
  useSyncExternalStore(
    (listener) => subscribeComposerAssets(() => listener()),
    extrasSnapshot,
    extrasSnapshot
  )
  return composerCanSend({ text: composer, hasChips: composerHasExtras() })
}

function extrasSnapshot() {
  return Number(composerHasExtras())
}
