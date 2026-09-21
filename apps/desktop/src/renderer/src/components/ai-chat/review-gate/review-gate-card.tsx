/**
 * 待验收同一屏：diff + 在浏览器打开 + 本轮来源 + 打回 / 通过。
 */
import { useT } from "@renderer/i18n"
import { SessionPreviewOpenButton } from "../composer/session-review/preview-open/session-preview-open-button"
import { SessionFileRow } from "../composer/session-review/session-review-files"
import type { SessionReviewFile } from "../composer/session-review/session-review.types"
import { collectTurnSources } from "../thread/sources/collect-turn-sources"
import type { TurnSourceChip } from "../thread/sources/source-chip"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { openSourcesSheet } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { cx } from "@/utils/cx"
import { ReviewGateFooter } from "./review-gate-footer"

export function ReviewGateCard({
  files,
  chips,
  canOpenPreview,
  previewBusy,
  busy,
  onOpenPreview,
  onOpenFile,
  onReject,
  onApprove
}: {
  files: SessionReviewFile[]
  chips: TurnSourceChip[]
  canOpenPreview: boolean
  previewBusy?: boolean
  busy?: boolean
  onOpenPreview: () => void
  onOpenFile: (path: string) => void
  onReject: () => void
  onApprove: () => void
}) {
  const t = useT()
  return (
    <div
      data-testid="review-gate-card"
      data-frost="tile"
      className="relative flex w-full flex-col gap-2.5 overflow-visible rounded-2xl border border-border-button-default bg-background-secondary-default/95 px-3.5 py-2.5 shadow-card backdrop-blur-md"
    >
      <p className="text-caption-2-regular text-text-tertiary">{t("sessionOps.gateSubtitle")}</p>
      {files.length > 0 ? (
        <ul className="max-h-40 min-h-0 overflow-y-auto rounded-xl border border-border-button-default">
          {files.map((file) => (
            <li key={file.path} className="border-b border-separator-border last:border-b-0">
              <SessionFileRow file={file} onOpen={onOpenFile} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.sessionReviewNoDiff")}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <SessionPreviewOpenButton enabled={canOpenPreview} busy={previewBusy} onOpen={onOpenPreview} />
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => openSourcesSheet({ chips, activeId: chip.id })}
            className={cx(
              "cursor-pointer truncate rounded-md px-2 py-0.5 text-caption-2-medium ring-1",
              "bg-background-tertiary-default text-text-primary ring-border-button-default hover:bg-background-secondary-hover"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <ReviewGateFooter busy={busy} onReject={onReject} onApprove={onApprove} />
    </div>
  )
}

export function chipsFromLastAssistant(
  message: Pick<ThreadMessage, "sources" | "tools"> | null,
  skillPrefix: (name: string) => string
): TurnSourceChip[] {
  if (!message) return []
  return collectTurnSources(message, skillPrefix)
}
