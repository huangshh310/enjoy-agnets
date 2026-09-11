/**
 * 皮肤迷你窗：经典 / 玻璃 / 手绘墨线 / 素描铅笔纸。
 * 玻璃预览的色与光斑走 skins/glass.css 的 [data-preview-skin=glass]，禁止组件内生造色板。
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
        <>
          <span aria-hidden="true" className="skin-glass-preview-orb skin-glass-preview-orb-nw" />
          <span aria-hidden="true" className="skin-glass-preview-orb skin-glass-preview-orb-ne" />
          <span aria-hidden="true" className="skin-glass-preview-orb skin-glass-preview-orb-s" />
        </>
      ) : null}
      <div className="relative z-10 flex h-full gap-1 p-1.5">
        <div
          className={cx("w-[26%] rounded-md", glass ? "skin-glass-preview-pane" : "bg-background-secondary-default")}
        />
        <div
          className={cx(
            "min-w-0 flex-1 rounded-md",
            glass ? "skin-glass-preview-pane" : "bg-background-primary-default"
          )}
        />
      </div>
    </div>
  )
}
