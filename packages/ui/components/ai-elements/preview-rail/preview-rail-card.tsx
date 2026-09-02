/**
 * 悬停预览卡片：BoardUI 表面，不要 registry 默认 bg-card。
 */
import { uiT, useUiLocale } from "@/i18n/ui-locale"
import type { PreviewRailItem } from "./preview-rail.types"

export function PreviewRailCard({ item }: { item: PreviewRailItem }) {
  useUiLocale()
  return (
    <div
      data-slot="preview-rail-card"
      className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <p className="truncate text-caption-1-semibold text-text-primary">{item.label}</p>
      {item.description ? (
        <div className="mt-1 line-clamp-3 break-words text-caption-2-regular leading-5 text-text-secondary">
          {item.description}
        </div>
      ) : (
        <p className="mt-1 text-caption-2-regular text-text-tertiary">
          {uiT("跳到这条消息", "Jump to this message")}
        </p>
      )}
    </div>
  )
}
