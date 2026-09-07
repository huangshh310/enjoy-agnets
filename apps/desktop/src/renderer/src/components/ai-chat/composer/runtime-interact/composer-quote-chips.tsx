/**
 * 输入框上方可关闭的引用 Chip，支持多选删除。
 */
import { RiCloseLine } from "@remixicon/react"
import { useSyncExternalStore } from "react"
import {
  listQuotedContexts,
  removeQuotedContext,
  subscribeQuotedContexts
} from "@renderer/hooks/quoted-context"

export function ComposerQuoteChips() {
  const quotes = useSyncExternalStore(
    subscribeQuotedContexts,
    listQuotedContexts,
    listQuotedContexts
  )
  if (quotes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      {quotes.map((quote) => (
        <span
          key={quote.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-button-default bg-background-tertiary-default px-2 py-0.5 text-caption-2-medium text-text-secondary"
        >
          <span className="truncate">{quote.title}</span>
          <button
            type="button"
            aria-label={quote.title}
            onClick={() => removeQuotedContext(quote.id)}
            className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full hover:bg-background-secondary-hover hover:text-text-primary"
          >
            <RiCloseLine className="size-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  )
}
