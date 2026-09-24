/**
 * 消息底引导词点击分流：idle 新开一轮；running 按 actionType 入队或只回填。
 * 禁止任何超时自动点击。
 */
import type { ActionChip, QuotedContext } from "@enjoy-agents/ipc-contract"
import { composeQuotedPrompt } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "../stores/chat-store"
import { resolveActionChipIntent } from "./action-chip-intent"
import { focusComposerEnd } from "./composer-focus"
import { enqueueFollowup, setRuntimeHint } from "./followup-queue"
import { setQuotedContexts, takeQuotedContexts } from "./quoted-context"
import { sendComposerMessage } from "./send-composer"

export { resolveActionChipIntent }

/** idle 发送时并上输入框已有引用，避免漏到下一轮。 */
export function composeChipSendPrompt(
  pendingQuotes: QuotedContext[],
  chipQuotes: QuotedContext[],
  prompt: string
): string {
  return composeQuotedPrompt([...pendingQuotes, ...chipQuotes], prompt)
}

export function applyActionChip(chip: ActionChip) {
  const store = useChatStore.getState()
  const intent = resolveActionChipIntent(store.running, chip.actionType)
  const quotes = chip.referencedContext ?? []
  if (intent === "send") {
    const pending = takeQuotedContexts()
    void sendComposerMessage({ content: composeChipSendPrompt(pending, quotes, chip.prompt) })
    return
  }
  if (intent === "fill_input") {
    setQuotedContexts(quotes)
    store.setComposer(chip.prompt)
    focusComposerEnd()
    return
  }
  if (!store.sessionId) return
  enqueueFollowup({
    sessionId: store.sessionId,
    prompt: composeQuotedPrompt(quotes, chip.prompt),
    draft: chip.prompt,
    quotedContexts: quotes,
    assets: []
  })
  setRuntimeHint("chipQueued", store.sessionId)
}
