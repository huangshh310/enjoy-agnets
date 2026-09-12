/**
 * 助手气泡底脚来源芯片：3–4 颗可见，其余收成 +N。
 */
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { collectTurnSources } from "./collect-turn-sources"
import { openSourceChip } from "./open-source-chip"
import { splitVisibleSourceChips, type TurnSourceChip } from "./source-chip"

export function SourceChips({
  sources,
  tools
}: {
  sources?: ThreadMessage["sources"]
  tools?: ThreadMessage["tools"]
}) {
  const t = useT()
  const navigate = useNavigate()
  const chips = collectTurnSources({ sources, tools }, (name) => t("chat.sourceSkillLabel", { name }))
  if (chips.length === 0) return null
  const { shown, rest } = splitVisibleSourceChips(chips)

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" data-testid="turn-source-chips">
      {shown.map((chip) => (
        <SourceChipButton
          key={chip.id}
          chip={chip}
          onOpen={() => void openSourceChip(chip, navigate)}
        />
      ))}
      {rest > 0 ? (
        <span className="rounded-md bg-background-tertiary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary ring-1 ring-border-button-default">
          {t("chat.sourceChipMore", { count: rest })}
        </span>
      ) : null}
    </div>
  )
}

function SourceChipButton({ chip, onOpen }: { chip: TurnSourceChip; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="max-w-full cursor-pointer truncate rounded-md bg-background-tertiary-default px-2 py-0.5 text-caption-2-medium text-text-primary ring-1 ring-border-button-default hover:bg-background-secondary-hover"
    >
      {chip.label}
    </button>
  )
}
