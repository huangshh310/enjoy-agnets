/**
 * 皮肤迷你窗：经典实心 / 玻璃光斑 / 手绘墨线。
 */
import { cx } from "@/utils/cx"
import type { ThemeSkin } from "@renderer/hooks/use-theme-skin"

export function AppearanceSkinPreview({ id }: { id: ThemeSkin }) {
  const glass = id === "glass"
  return (
    <div
      data-preview-skin={id}
      className="relative aspect-[5/3] w-full overflow-hidden rounded-lg bg-background-full"
    >
      {glass ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 -left-4 size-14 rounded-full bg-accent-500/30 blur-2xl"
        />
      ) : null}
      <div className="flex h-full gap-1 p-1.5">
        <div
          className={cx(
            "w-[26%] rounded-md",
            glass ? "bg-background-secondary-default/45" : "bg-background-secondary-default"
          )}
        />
        <div
          className={cx(
            "min-w-0 flex-1 rounded-md",
            glass ? "bg-background-primary-default/50" : "bg-background-primary-default"
          )}
        />
      </div>
    </div>
  )
}
