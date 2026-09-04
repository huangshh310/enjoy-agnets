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
      className="group flex w-40 cursor-pointer flex-col gap-2 text-left outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <span
        className={cx(
          "block overflow-hidden rounded-xl p-px ring-1 transition-all duration-200",
          selected
            ? "ring-2 ring-accent-500 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
            : "ring-border-button-default group-hover:ring-border-button-hover group-hover:shadow-xs",
          "group-focus-visible:ring-2 group-focus-visible:ring-border-focus-ring"
        )}
      >
        <AppearanceSkinPreview id={option.id} />
      </span>
      <div className="flex items-center justify-between">
        <span
          className={cx(
            "text-caption-1-medium transition-colors",
            selected ? "font-semibold text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"
          )}
        >
          {option.name}
        </span>
        {selected ? (
          <span className="size-1.5 rounded-full bg-accent-500 animate-in zoom-in-50 duration-200" />
        ) : null}
      </div>
    </button>
  )
}
