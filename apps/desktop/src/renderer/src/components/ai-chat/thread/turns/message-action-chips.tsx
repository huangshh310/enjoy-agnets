/**
 * 助手气泡底部的静态引导词。只响应点击，不做倒计时自动发送。
 */
import type { ActionChip } from "@enjoy-agents/ipc-contract"
import { applyActionChip } from "@renderer/hooks/apply-action-chip"

export function MessageActionChips({ chips }: { chips: ActionChip[] }) {
  if (chips.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          title={chip.prompt}
          onClick={() => applyActionChip(chip)}
          className="max-w-full cursor-pointer truncate rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-1-regular text-text-secondary transition-colors hover:border-accent-500/40 hover:text-text-primary active:scale-[0.98]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
