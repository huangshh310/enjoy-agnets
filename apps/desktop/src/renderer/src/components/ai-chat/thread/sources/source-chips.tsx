/**
 * 助手气泡底脚来源芯片：3–4 颗可见，其余 +N。点芯片（含 +N）打开「本轮来源」sheet。
 */
import { useState } from "react"
import { useT } from "@renderer/i18n"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { collectTurnSources } from "./collect-turn-sources"
import { SourceDetailSheet } from "./source-detail-sheet"
import { splitVisibleSourceChips, type TurnSourceChip } from "./source-chip"

export function SourceChips({
  sources,
  tools
}: {
  sources?: ThreadMessage["sources"]
  tools?: ThreadMessage["tools"]
}) {
  const t = useT()
  const chips = collectTurnSources({ sources, tools }, (name) => t("chat.sourceSkillLabel", { name }))
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  if (chips.length === 0) return null
  const { shown, rest } = splitVisibleSourceChips(chips)

  function openSheet(chipId: string | null) {
    setActiveId(chipId)
    setOpen(true)
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5" data-testid="turn-source-chips">
        {shown.map((chip) => (
          <SourceChipButton
            key={chip.id}
            chip={chip}
            selected={open && activeId === chip.id}
            onOpen={() => openSheet(chip.id)}
          />
        ))}
        {rest > 0 ? (
          <button
            type="button"
            data-testid="turn-source-chip-more"
            onClick={() => openSheet(null)}
            className={cx(
              "cursor-pointer rounded-md px-2 py-0.5 text-caption-2-medium ring-1 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              open && activeId == null
                ? "bg-accent-50 text-accent-500 ring-accent-500/30"
                : "bg-background-tertiary-default text-text-tertiary ring-border-button-default hover:bg-background-secondary-hover"
            )}
          >
            {t("chat.sourceChipMore", { count: rest })}
          </button>
        ) : null}
      </div>
      <SourceDetailSheet open={open} chips={chips} activeId={activeId} onClose={() => setOpen(false)} />
    </>
  )
}

function SourceChipButton({
  chip,
  selected,
  onOpen
}: {
  chip: TurnSourceChip
  selected: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      data-testid="turn-source-chip"
      onClick={onOpen}
      className={cx(
        "max-w-full cursor-pointer truncate rounded-md px-2 py-0.5 text-caption-2-medium ring-1 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "bg-accent-50 text-accent-500 ring-accent-500/30"
          : "bg-background-tertiary-default text-text-primary ring-border-button-default hover:bg-background-secondary-hover"
      )}
    >
      {chip.label}
    </button>
  )
}
