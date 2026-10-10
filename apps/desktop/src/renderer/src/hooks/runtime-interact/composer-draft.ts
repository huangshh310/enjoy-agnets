/**
 * Composer 草稿快照：引用 Chip、技能 Chip、知识 Chip 与正文拼成发送文本。
 */
import { composeQuotedPrompt } from "@enjoy-agents/ipc-contract"
import { coerceComposerMode } from "../../components/ai-chat/composer/composer-mode"
import { applyLeadingSlash } from "../../components/ai-chat/composer/mentions/consume-slash.ts"
import {
  addComposerSkillChip,
  listComposerSkillChips,
  listKnownSkills,
  takeComposerSkillChips,
  type SkillMention
} from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import { formatSkillMentions } from "../../components/ai-chat/composer/mentions/format-skill-mention.ts"
import { applyHostModePrefix } from "../../components/ai-chat/composer/mentions/host-mode-prefix.ts"
import { compactSessionOrReport } from "../../components/ai-chat/right-pane/views/context/compact-session/run-session-compact.ts"
import { isAcpComposerRuntime } from "../../lib/agent-runtime"
import { useChatStore } from "../../stores/chat-store"
import { listQuotedContexts, takeQuotedContexts } from "../quoted-context"
import { formatContextChipsForSend, takeSessionContextChips } from "../session-context-chips"

import { flushComposerDomToStore, syncComposerDom } from "../composer-dom"

export { flushComposerDomToStore, syncComposerDom }

/** 取出引用、技能与知识 Chip，并消化句首 /plan、/compact 或 /技能。 */
export async function takeComposerText(): Promise<string> {
  const store = useChatStore.getState()
  const parsed = applyLeadingSlash(flushComposerDomToStore() || store.composer, listKnownSkills())
  if (parsed.mode) store.setMode(parsed.mode)
  if (parsed.command === "compact") {
    const ok = await compactSessionOrReport(store.sessionId)
    if (!ok || !parsed.text) {
      store.setComposer("")
      return ""
    }
  }
  if (parsed.skill) addComposerSkillChip(parsed.skill)
  return finishComposerText(parsed.text === "/" ? "" : parsed.text)
}

/** ACP 每一轮发送口都垫围栏：Composer、引导、继续、⌘L。 */
export function prefixHostModeForSend(content: string): string {
  const store = useChatStore.getState()
  return applyHostModePrefix(
    isAcpComposerRuntime(store.runtimeId),
    coerceComposerMode(store.mode),
    content
  )
}

function finishComposerText(draft: string): string {
  const store = useChatStore.getState()
  const quotes = takeQuotedContexts()
  const chips = takeSessionContextChips()
  const skills = takeComposerSkillChips()
  const body = [formatSkillMentions(skills), formatContextChipsForSend(chips), draft]
    .filter(Boolean)
    .join("\n\n")
  if (!body && quotes.length === 0) {
    store.setComposer("")
    return ""
  }
  return composeQuotedPrompt(quotes, body)
}

/** 入队前留下引用与技能快照，发送成功后再清草稿。 */
export function snapshotComposerDraft() {
  return {
    quotes: listQuotedContexts(),
    skills: listComposerSkillChips(),
    draft: useChatStore.getState().composer.trim()
  }
}

export type ComposerDraftSnapshot = {
  quotes: ReturnType<typeof listQuotedContexts>
  skills: SkillMention[]
  draft: string
}

export function clearComposerDraft() {
  const store = useChatStore.getState()
  store.setComposer("")
  syncComposerDom("")
  if (store.sessionId) {
    store.clearSessionDraft(store.sessionId)
  }
}
