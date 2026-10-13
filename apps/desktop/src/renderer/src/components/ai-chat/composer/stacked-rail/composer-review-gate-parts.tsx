/**
 * 待验收条的动作与展开区。折叠：去审查 / 打回 / 通过；展开：改动文件胶囊 + 来源 + 一句人话。
 * 「在浏览器打开」只在真有网页可开（.html/.htm 或可达的本机预览地址）时出现，不画灰死钮。
 */
import { FileTypeIcon } from "@renderer/components/ai-chat/file-type-icon"
import { useT } from "@renderer/i18n"
import { openSourcesSheet } from "@renderer/stores/sources-sheet/sources-sheet-store"
import type { TurnSourceChip } from "../../thread/sources/source-chip"
import { SessionPreviewOpenButton } from "../session-review/preview-open/session-preview-open-button"
import type { SessionReviewFile } from "../session-review/session-review.types"

const CHIP_CLASS_NAME =
  "inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1 truncate rounded-md px-2 py-0.5 text-caption-2-medium text-text-primary ring-1 ring-border-button-default hover:bg-background-secondary-hover"

export function GateRowActions({
  busy,
  onReview,
  onReject,
  onApprove
}: {
  busy: boolean
  onReview: () => void
  onReject: () => void
  onApprove: () => void
}) {
  const t = useT()
  const quiet =
    "h-6 cursor-pointer rounded-md px-2 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary disabled:opacity-50"
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" data-testid="review-gate-open" onClick={onReview} className={quiet}>
        {t("sessionOps.goReview")}
      </button>
      <button
        type="button"
        data-testid="review-gate-reject"
        disabled={busy}
        onClick={onReject}
        className={quiet}
      >
        {t("sessionOps.reject")}
      </button>
      <button
        type="button"
        data-testid="review-gate-approve"
        disabled={busy}
        onClick={onApprove}
        className="ml-1 flex h-6 items-center rounded-md bg-accent-500 px-2.5 text-caption-2-medium text-text-white hover:bg-accent-600 disabled:opacity-50"
      >
        {t("sessionOps.approve")}
      </button>
    </div>
  )
}

export function GateExpanded({
  files,
  placeholderKey,
  chips,
  canOpenPreview,
  previewBusy,
  onOpenPreview,
  onOpenFile
}: {
  files: SessionReviewFile[]
  placeholderKey: string
  chips: TurnSourceChip[]
  canOpenPreview: boolean
  previewBusy?: boolean
  onOpenPreview: () => void
  onOpenFile: (path: string) => void
}) {
  const t = useT()
  const fileNames = new Set(files.map((file) => file.name))
  const sources = chips.filter((chip) => !fileNames.has(chip.label))
  return (
    <div data-testid="review-gate-expanded" className="flex min-w-0 flex-col gap-1.5 pb-0.5">
      {files.length === 0 ? (
        <p className="text-caption-2-regular text-text-tertiary">{t(placeholderKey)}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {files.map((file) => (
          <button
            key={file.path}
            type="button"
            data-testid="review-gate-file"
            title={file.path}
            onClick={() => onOpenFile(file.path)}
            className={`${CHIP_CLASS_NAME} font-mono`}
          >
            <FileTypeIcon name={file.name} kind={file.kind} size={13} />
            <span className="truncate">{file.name}</span>
          </button>
        ))}
        {sources.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => openSourcesSheet({ chips, activeId: chip.id })}
            className={CHIP_CLASS_NAME}
          >
            {chip.label}
          </button>
        ))}
        {canOpenPreview ? (
          <SessionPreviewOpenButton enabled busy={previewBusy} onOpen={onOpenPreview} />
        ) : null}
      </div>
      <p className="truncate text-caption-2-regular text-text-tertiary">{t("sessionOps.gateHint")}</p>
    </div>
  )
}

/** 矮窗（≤640 高）展开时不另起几行：文件一句 + 提示弱化接在同一行末尾（luna #149：消息区 ≥ 96px）。 */
export function GateCompactPeek({
  files,
  placeholderKey
}: {
  files: SessionReviewFile[]
  placeholderKey: string
}) {
  const t = useT()
  const line =
    files.length === 0
      ? t(placeholderKey)
      : t("sessionOps.gateFilesLine", { n: files.length, names: files.map((file) => file.name).join("、") })
  return (
    <span
      title={`${line}\n${t("sessionOps.gateHint")}`}
      className="min-w-0 flex-1 truncate whitespace-nowrap"
    >
      <span data-testid="review-gate-compact" className="text-text-primary">
        {line}
      </span>
      <span data-testid="review-gate-compact-hint" className="text-text-tertiary">
        {" · "}
        {t("sessionOps.gateHint")}
      </span>
    </span>
  )
}
