/**
 * Composer 草稿快照：引用 Chip、知识 Chip 与正文拼成发送文本。
 */
import { composeQuotedPrompt } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../../stores/chat-store"
import { listQuotedContexts, takeQuotedContexts } from "../quoted-context"
import { formatContextChipsForSend, takeSessionContextChips } from "../session-context-chips"

/** 取出引用与知识 Chip，和输入框正文拼成完整 Prompt。 */
export function takeComposerText(): string {
  const draft = useChatStore.getState().composer.trim()
  const quotes = takeQuotedContexts()
  const chips = takeSessionContextChips()
  return composeQuotedPrompt(quotes, [formatContextChipsForSend(chips), draft].filter(Boolean).join("\n\n"))
}

/** 入队前留下引用快照，发送成功后再清草稿。 */
export function snapshotComposerDraft() {
  return {
    quotes: listQuotedContexts(),
    draft: useChatStore.getState().composer.trim()
  }
}

export function clearComposerDraft() {
  useChatStore.getState().setComposer("")
}
