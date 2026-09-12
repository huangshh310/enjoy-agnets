/**
 * 「本轮来源」右（窄屏底）sheet。点芯片打开，不上 InlineCitations。
 */
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { openSourceRow } from "./open-source-row"
import { SourceDetailRow } from "./source-detail-row"
import type { TurnSourceChip } from "./source-chip"

export function SourceDetailSheet({
  open,
  chips,
  activeId,
  onClose
}: {
  open: boolean
  chips: readonly TurnSourceChip[]
  activeId: string | null
  onClose: () => void
}) {
  useEscapeToClose(open, onClose)
  if (!open || chips.length === 0 || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <SheetScrim onClose={onClose} />
      <SheetPanel chips={chips} activeId={activeId} onClose={onClose} />
    </div>,
    document.body
  )
}

function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return
      event.preventDefault()
      onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])
}

function SheetScrim({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      aria-label={t("chat.sourcesSheetClose")}
    />
  )
}

function SheetPanel({
  chips,
  activeId,
  onClose
}: {
  chips: readonly TurnSourceChip[]
  activeId: string | null
  onClose: () => void
}) {
  const t = useT()
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="turn-sources-sheet-title"
      data-testid="turn-sources-sheet"
      className={cx(
        "absolute flex flex-col overflow-hidden border border-border-button-default bg-background-primary-default shadow-card",
        "inset-x-3 bottom-3 top-auto max-h-[min(70vh,32rem)] rounded-3xl animate-in slide-in-from-bottom duration-200",
        "md:inset-y-3 md:right-3 md:left-auto md:top-3 md:max-h-none md:w-[min(20rem,calc(100vw-1.5rem))] md:slide-in-from-right"
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-separator-border px-4 py-3">
        <div className="min-w-0">
          <h3 id="turn-sources-sheet-title" className="text-headline-semibold text-text-primary">
            {t("chat.sourcesSheetTitle")}
          </h3>
          <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
            {t("chat.sourcesSheetMeta", { n: chips.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-caption-1-regular text-text-tertiary hover:text-text-primary"
        >
          {t("chat.sourcesSheetClose")}
        </button>
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-separator-border overflow-y-auto">
        {chips.map((chip) => (
          <SourceDetailRow key={chip.id} chip={chip} selected={chip.id === activeId} onOpen={openSourceRow} />
        ))}
      </ul>
      <p className="border-t border-separator-border bg-background-secondary-default px-3 py-2 text-caption-2-regular text-text-tertiary">
        {t("chat.sourcesSheetFooter")}
      </p>
    </aside>
  )
}
