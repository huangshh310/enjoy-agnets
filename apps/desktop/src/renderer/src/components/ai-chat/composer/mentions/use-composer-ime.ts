/**
 * 组字 / 建会话期间用本地稿，禁止受控 value 把 store 半成品写回去。
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from "react"
import {
  isComposerComposing,
  lastComposerSubmitted,
  setComposerComposing,
  shouldClearShownOnPreparing,
  shouldClearShownOnQueuedSend,
  shownAfterCompositionOnPreparing
} from "@renderer/hooks/composer-ime"
import { shouldHoldComposerStoreSync } from "@renderer/hooks/composer-dom"
import { isNewSessionCreatePending } from "@renderer/hooks/new-session-create"
import { useChatStore } from "@renderer/stores/chat-store"

export function useComposerIme(value: string, onChange: (next: string) => void) {
  const composingRef = useRef(false)
  const [shown, setShown] = useState(value)
  const shownRef = useRef(shown)
  shownRef.current = shown
  const preparing = useChatStore((state) => state.preparingHint)
  const wasPreparing = useRef(false)

  useEffect(() => {
    if (
      shouldClearShownOnPreparing({
        preparing,
        wasPreparing: wasPreparing.current,
        value,
        createPending: isNewSessionCreatePending(),
        composing: composingRef.current || isComposerComposing(),
        shown: shownRef.current,
        submitted: lastComposerSubmitted()
      })
    ) {
      setShown("")
    }
    wasPreparing.current = preparing
  }, [preparing, value])

  useEffect(() => {
    if (composingRef.current) return
    // jojo P1：首发入队清稿（store 变空）时，输入框若还是刚交出去的那句就跟着清；写回锁期间也要清。
    if (!value && shouldClearShownOnQueuedSend(shownRef.current, lastComposerSubmitted())) {
      setShown("")
      return
    }
    if (shouldHoldComposerStoreSync()) return
    setShown(value)
  }, [value])

  /** 程序化改稿（@ 选中剥 token 等）：shown 一起改，建会话 / 写回锁期间也不让输入框留旧 token。 */
  const replace = useCallback(
    (next: string) => {
      setShown(next)
      onChange(next)
    },
    [onChange]
  )

  return {
    value: shown,
    replace,
    onCompositionStart() {
      composingRef.current = true
      setComposerComposing(true)
    },
    onCompositionUpdate(event: CompositionEvent<HTMLTextAreaElement>) {
      setShown(event.currentTarget.value)
    },
    onCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
      const typed = event.currentTarget.value
      composingRef.current = false
      setComposerComposing(false)
      // preparing 翻起时在组字没擦成：组字结束补查，已交出去的旧句不留。
      // 已知窄窗：这里不看 wasPreparing——preparing 期间用户新起一句、恰以旧句开头，
      // 组字结束时旧句那段前缀会被一并擦掉（只剩后半）。窗口仅限建会话 + 准备中，接受。
      const erased = shownAfterCompositionOnPreparing({
        preparing: useChatStore.getState().preparingHint,
        createPending: isNewSessionCreatePending(),
        composing: false,
        shown: typed,
        submitted: lastComposerSubmitted()
      })
      const next = erased ?? typed
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
