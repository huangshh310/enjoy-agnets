/**
 * 把召回状态机接到当前会话的用户气泡与输入框。
 */
import { useEffect, useState, type KeyboardEvent, type RefObject } from "react"
import { listRecallPrompts } from "../lib/user-message-text.ts"
import { useChatStore } from "../stores/chat-store"
import { composerHasExtras } from "./composer-draft-extras"
import {
  applyRecallDown,
  applyRecallUp,
  caretOnFirstLine,
  caretOnLastLine,
  EMPTY_RECALL_STATE,
  type RecallState
} from "./composer-prompt-history"

export { composerHasExtras } from "./composer-draft-extras"

export function useComposerPromptHistory(input: {
  value: string
  onChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}): (event: KeyboardEvent<HTMLTextAreaElement>) => boolean {
  const messages = useChatStore((state) => state.messages)
  const sessionId = useChatStore((state) => state.sessionId)
  const [state, setState] = useState<RecallState>(EMPTY_RECALL_STATE)

  useEffect(() => {
    setState(EMPTY_RECALL_STATE)
  }, [sessionId])

  return (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return false
    const textarea = event.currentTarget
    const prompts = listRecallPrompts(messages)
    const payload = {
      value: input.value,
      prompts,
      state,
      composerBusy: composerHasExtras()
    }
    const next =
      event.key === "ArrowUp"
        ? applyRecallUp({
            ...payload,
            caretOnFirstLine: caretOnFirstLine(input.value, textarea.selectionStart)
          })
        : applyRecallDown({
            ...payload,
            caretOnLastLine: caretOnLastLine(input.value, textarea.selectionStart)
          })
    if (!next) return false
    event.preventDefault()
    input.onChange(next.value)
    setState(next.state)
    const caret = event.key === "ArrowUp" ? 0 : next.value.length
    queueMicrotask(() => {
      input.textareaRef.current?.setSelectionRange(caret, caret)
    })
    return true
  }
}
