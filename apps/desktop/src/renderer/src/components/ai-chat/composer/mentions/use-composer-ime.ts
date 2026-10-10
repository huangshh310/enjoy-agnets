/**
 * 组字期间用本地稿，禁止受控 value 把 IME 候选写回去。
 */
import { useEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from "react"
import { setComposerComposing } from "@renderer/hooks/composer-ime"

export function useComposerIme(value: string, onChange: (next: string) => void) {
  const composingRef = useRef(false)
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (!composingRef.current) setShown(value)
  }, [value])

  return {
    value: shown,
    onCompositionStart() {
      composingRef.current = true
      setComposerComposing(true)
    },
    onCompositionUpdate(event: CompositionEvent<HTMLTextAreaElement>) {
      setShown(event.currentTarget.value)
    },
    onCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
      const next = event.currentTarget.value
      composingRef.current = false
      setComposerComposing(false)
      setShown(next)
      onChange(next)
    },
    onValueChange(event: ChangeEvent<HTMLTextAreaElement>) {
      const next = event.target.value
      setShown(next)
      if (!composingRef.current) onChange(next)
    }
  }
}
