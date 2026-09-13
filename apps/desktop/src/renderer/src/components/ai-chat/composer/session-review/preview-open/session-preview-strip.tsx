import { RiCloseLine, RiGlobeLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { SessionPreviewOpenButton } from "./session-preview-open-button"
import { previewTargetLabel } from "./pick-preview-target"
import type { PreviewTarget } from "./preview-open.types"

export function SessionPreviewStrip({
  target,
  busy,
  onOpen,
  onDismiss
}: {
  target: PreviewTarget
  busy?: boolean
  onOpen: () => void
  onDismiss?: () => void
}) {
  const t = useT()
  return (
    <div className="flex w-full justify-center px-4">
      <div
        data-session-preview
        data-frost="tile"
        className={cx(
          "relative flex h-8 min-w-0 max-w-xl items-center justify-between gap-3 rounded-full",
          "border border-border-button-default bg-background-primary-default/95 px-3 py-1 shadow-card backdrop-blur-md",
          "animate-in fade-in-50 zoom-in-95 duration-200"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <RiGlobeLine className="size-3.5" />
          </span>
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <span
            title={t("chat.sessionReviewOpenPreview")}
            className="truncate font-mono text-caption-1-medium tracking-tight text-text-primary select-all"
          >
            {previewTargetLabel(target)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SessionPreviewOpenButton enabled busy={busy} onOpen={onOpen} />
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              title={t("common.close") || "关闭"}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-tertiary-default hover:text-text-primary"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
