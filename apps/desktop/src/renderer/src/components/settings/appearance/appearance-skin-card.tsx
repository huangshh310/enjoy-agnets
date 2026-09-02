/**
 * 皮肤选项：迷你窗预览 + 短名。选中靠细环，不要对勾和大段文案。
 */
import { cx } from "@/utils/cx"
import { applyThemeSkin } from "@renderer/hooks/use-theme-skin"
import type { AppearanceSkinOption } from "./appearance-skin.types"
import { AppearanceSkinPreview } from "./appearance-skin-preview"

export function AppearanceSkinCard({
  option,
  selected
}: {
  option: AppearanceSkinOption
  selected: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={option.name}
      title={option.hint}
      onClick={() => applyThemeSkin(option.id)}
      className="group flex w-40 cursor-pointer flex-col gap-2 text-left outline-none"
    >
      <span
        className={cx(
          "block overflow-hidden rounded-xl p-px ring-1 transition-shadow",
          selected ? "ring-accent-500" : "ring-border-button-default group-hover:ring-border-button-hover",
          "group-focus-visible:ring-2 group-focus-visible:ring-border-focus-ring"
        )}
      >
        <AppearanceSkinPreview id={option.id} />
      </span>
      <span
        className={cx(
          "text-caption-1-medium",
          selected ? "text-text-primary" : "text-text-tertiary"
        )}
      >
        {option.name}
      </span>
    </button>
  )
}
