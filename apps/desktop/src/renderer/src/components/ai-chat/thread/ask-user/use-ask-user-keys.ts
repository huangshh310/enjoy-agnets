/**
 * 数字键 1–9：选项直接点选，「其它」聚焦输入框。
 */
import { useEffect, useRef, type RefObject } from "react"
import { otherKeyIndex } from "./ask-user-answers"
import type { AskUserQuestion } from "./ask-user.types"

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
}

/** 挂在当前题上的全局数字键；用 ref 读最新回调，避免按键闭包过期。 */
export function useAskUserKeys({
  question,
  otherRef,
  onDigit
}: {
  question: AskUserQuestion | undefined
  otherRef: RefObject<HTMLTextAreaElement | null>
  onDigit: (optionId: string) => void
}) {
  const onDigitRef = useRef(onDigit)
  onDigitRef.current = onDigit
  useEffect(() => {
    if (!question) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0) return
      const option = question.options[index]
      if (option) {
        event.preventDefault()
        onDigitRef.current(option.id)
        return
      }
      if (index === otherKeyIndex(question)) {
        event.preventDefault()
        otherRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [question, otherRef])
}
