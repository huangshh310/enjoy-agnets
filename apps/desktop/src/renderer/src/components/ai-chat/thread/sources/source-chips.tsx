/**
 * 助手气泡底脚来源芯片：3–4 颗可见，其余 +N。点芯片（含 +N）打开「本轮来源」sheet。
 */
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { useHostInjectNames } from "@renderer/stores/host-inject/host-inject-store"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { openSourcesSheet, useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { cx } from "@/utils/cx"
import { collectTurnSources } from "./collect-turn-sources"
import { splitVisibleSourceChips, type TurnSourceChip } from "./source-chip"

export function SourceChips({
  sources,
  tools,
  messageId
}: {
  sources?: ThreadMessage["sources"]
  tools?: ThreadMessage["tools"]
  messageId?: string
}) {
  const t = useT()
  const sessionId = useChatStore((state) => state.sessionId)
  const hostInject = useHostInjectNames(sessionId, messageId)
  const chips = collectTurnSources(
    { sources, tools, hostInject },
    (name) => t("chat.sourceSkillLabel", { name })
  )
  const open = useSourcesSheetStore((state) => state.open)
  const activeId = useSourcesSheetStore((state) => state.activeId)
  if (chips.length === 0) return null
  const { shown, rest } = splitVisibleSourceChips(chips)

  /** 芯片 / +N 只开 sheet。有 path 也不直跳审查；审查只从 sheet 文件行。 */
  function openSheet(chipId: string | null) {
    openSourcesSheet({ chips, activeId: chipId })
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
