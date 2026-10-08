/**
 * 长按后的最近页面。从新到旧，最多 10 条。
 */
import { useEffect, useRef } from "react"
import { cx } from "@/utils/cx"
import type { HistoryEntry } from "@renderer/hooks/nav-history/nav-history.types"

export function NavHistoryMenu({
  entries,
  label,
  onSelect,
  onClose
}: {
  entries: HistoryEntry[]
  label: string
  onSelect: (index: number) => void
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (panel.current?.contains(event.target as Node)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("pointerdown", onPointer)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onPointer)
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div
      ref={panel}
      role="menu"
      aria-label={label}
      className="absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-card"
    >
      {entries.map((entry, index) => (
        <button
          key={`${entry.id}-${index}`}
          type="button"
          role="menuitem"
          onClick={() => onSelect(index)}
          className={cx(
            "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left",
            "text-caption-1-medium text-text-primary outline-none",
            "hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          )}
        >
          <span className="truncate">{entry.title}</span>
        </button>
      ))}
    </div>
  )
}
