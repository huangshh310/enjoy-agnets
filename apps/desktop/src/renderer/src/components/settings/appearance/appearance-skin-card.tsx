/**
 * 外观页单个皮肤选项卡。
 */
import { RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { applyThemeSkin } from "@renderer/hooks/use-theme-skin"
import type { AppearanceSkinOption } from "./appearance-skin.types"

export function AppearanceSkinCard({
  option,
  selected
}: {
  option: AppearanceSkinOption
  selected: boolean
}) {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={() => applyThemeSkin(option.id)}
      className={cx(
        "flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all cursor-pointer outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "border-accent-500/80 bg-accent-500/5 shadow-2xs"
          : "border-border-button-default bg-background-secondary-default/40 hover:bg-background-secondary-default/80"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cx(
              "flex size-8 items-center justify-center rounded-xl transition-colors",
              selected
                ? "bg-accent-500 text-text-white"
                : "bg-background-secondary-default text-text-tertiary"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <span className="text-title-3-semibold text-text-primary">{option.name}</span>
        </div>
        {selected ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-accent-500 text-text-white">
            <RiCheckLine className="size-3.5 stroke-[2.5]" />
          </span>
        ) : null}
      </div>
      <p className="text-caption-1-regular text-text-tertiary">{option.desc}</p>
    </button>
  )
}
