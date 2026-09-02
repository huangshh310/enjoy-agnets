/**
 * 皮肤迷你窗：用真实 token 示意实体 vs 磨砂，不是图标卡。
 */
import { cx } from "@/utils/cx"
import type { ThemeSkin } from "@renderer/hooks/use-theme-skin"

export function AppearanceSkinPreview({ id }: { id: ThemeSkin }) {
  const glass = id === "glass"
  return (
    <div className="relative aspect-[5/3] w-full overflow-hidden rounded-lg bg-background-full">
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
