/**
 * 气泡划词浮层：只把选区加入 Composer 引用，不开新会话。
 */
import { useEffect, useState } from "react"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { quoteTextSelection, selectionInsideThread } from "@renderer/lib/quote-text-selection"
import { useT } from "@renderer/i18n"

type Anchor = { left: number; top: number; text: string; messageId?: string }

export function TranscriptSelectionAction() {
  const t = useT()
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  useEffect(() => {
    function onMouseUp() {
      window.setTimeout(() => {
        const selection = window.getSelection()
        const hit = selectionInsideThread(selection)
        if (!hit || !selection || selection.rangeCount === 0) {
          setAnchor(null)
          return
        }
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          setAnchor(null)
          return
        }
        setAnchor({
          left: rect.left + rect.width / 2,
          top: Math.max(8, rect.top - 8),
          text: hit.text,
          messageId: hit.messageId
        })
      }, 0)
    }
    document.addEventListener("mouseup", onMouseUp)
    return () => document.removeEventListener("mouseup", onMouseUp)
  }, [])

  if (!anchor) return null

  return (
    <button
      type="button"
      data-testid="transcript-selection-action"
      style={{ left: anchor.left, top: anchor.top }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-1-medium text-text-primary shadow-card hover:bg-background-secondary-hover"
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={() => {
        const quote = quoteTextSelection({ text: anchor.text, messageId: anchor.messageId })
        if (quote) addQuotedContext(quote)
        window.getSelection()?.removeAllRanges()
        setAnchor(null)
      }}
    >
      {t("chat.addSelectionToChat")}
    </button>
  )
}
