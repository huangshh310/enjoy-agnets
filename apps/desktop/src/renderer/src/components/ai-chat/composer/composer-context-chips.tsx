/**
 * Composer 上方已钉入的知识芯片，可移除。
 */
import { RiBookOpenLine, RiCloseLine } from "@remixicon/react"
import { useSyncExternalStore } from "react"
import {
  listSessionContextChips,
  removeSessionContextChip,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { useT } from "@renderer/i18n"

export function ComposerContextChips() {
  const t = useT()
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-text-secondary"
        >
          <RiBookOpenLine className="size-3 shrink-0 text-accent-500" />
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            className="text-text-tertiary hover:text-text-primary"
            aria-label={t("common.close")}
            onClick={() => removeSessionContextChip(chip.id)}
          >
            <RiCloseLine className="size-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
