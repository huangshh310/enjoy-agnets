/**
 * 本轮改动：输入框上方一行「n 个文件」+ 审查。待验收也走同一条叠轨，可折叠。
 */
import { useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiFileEditLine } from "@remixicon/react"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ComposerStackedRow } from "./composer-stacked-row"
import { STACKED_PANEL_CLASS_NAME } from "./composer-stacked-styles"
import { keepSessionReview, undoSessionReview } from "../session-review/composer-session-review"
import { SessionFileTrigger } from "../session-review/session-review-files"
import { openSessionReview } from "../session-review/open-session-review"
import { useSessionReviewModel } from "../session-review/use-session-review-model"
import { useOpenSessionPreview } from "../session-review/preview-open/use-open-session-preview"
import { usePreviewUrlReachable } from "../session-review/preview-open/use-preview-url-reachable"
import { SessionPreviewOpenButton } from "../session-review/preview-open/session-preview-open-button"
import { chipsFromLastAssistant } from "../../review-gate/review-gate-card"
import { approveReviewGate, rejectReviewGate } from "../../review-gate/review-gate-actions"
import { lastAssistantTurn } from "../../run-ledger/collect-run-ledger"
import { openSourcesSheet } from "@renderer/stores/sources-sheet/sources-sheet-store"
import type { TurnSourceChip } from "../../thread/sources/source-chip"
import { reviewBannerPeek } from "../session-review/review-banner-peek"
import type { SessionReviewFile } from "../session-review/session-review.types"

export function ComposerLiveChanges() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const error = useChatStore((state) => state.error)
  const sessionId = useChatStore((state) => state.sessionId)
  const model = useSessionReviewModel()
  const preview = useOpenSessionPreview()
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)

  const previewUrl = model.previewTarget?.kind === "url" ? model.previewTarget.url : null
  const urlReachable = usePreviewUrlReachable(previewUrl)
  const canOpenPreview =
    model.previewTarget != null && (model.previewTarget.kind === "html" || urlReachable)
  const showGate = model.needsReview && !running
  if (!showGate && !model.showReview) return null

  const files = model.files
  const additions = files.reduce((sum, file) => sum + file.additions, 0)
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0)
  const peek = reviewBannerPeek(
    files,
    { stopped: Boolean(error) && !running, placeholder: showGate },
    t
  )
  const chips = chipsFromLastAssistant(lastAssistantTurn(messages), (name) =>
    t("chat.sourceSkillLabel", { name })
  )

  return (
    <div
      data-testid={showGate ? "review-gate-card" : "composer-live-changes"}
      className={STACKED_PANEL_CLASS_NAME}
    >
      <LiveChangesRow
        showGate={showGate}
        peek={peek}
        additions={additions}
        deletions={deletions}
        filesOpen={filesOpen}
        onToggle={() => setFilesOpen((open) => !open)}
        files={files}
        chips={chips}
        canOpenPreview={canOpenPreview}
        previewBusy={preview.busy}
        onOpenPreview={() => model.previewTarget && void preview.open(model.previewTarget)}
        actions={
          showGate ? (
            <GateRowActions
              busy={busy}
              onReject={() => void rejectReviewGate(sessionId)}
              onApprove={() => void approveReviewGate(sessionId, model.filesKey)}
            />
          ) : (
            <KeepRowActions
              busy={busy}
              empty={files.length === 0}
              onUndo={() => setUndoOpen(true)}
              onKeep={() => keepSessionReview(model.filesKey)}
              onReview={() => expandInspector("review")}
            />
          )
        }
      />
      <ConfirmDialog
        open={undoOpen}
        destructive
        title={t("chat.sessionReviewUndoConfirmTitle")}
        description={t("chat.sessionReviewUndoConfirmDesc", { n: files.length })}
        confirmLabel={t("chat.sessionReviewUndoAll")}
        onOpenChange={setUndoOpen}
        onConfirm={() => void undoSessionReview(files, model.filesKey, queryClient, setBusy, t)}
      />
    </div>
  )
}

function LiveChangesRow({
  showGate,
  peek,
  additions,
  deletions,
  filesOpen,
  onToggle,
  files,
  chips,
  canOpenPreview,
  previewBusy,
  onOpenPreview,
  actions
}: {
  showGate: boolean
  peek: string
  additions: number
  deletions: number
  filesOpen: boolean
  onToggle: () => void
  files: SessionReviewFile[]
  chips: TurnSourceChip[]
  canOpenPreview: boolean
  previewBusy?: boolean
  onOpenPreview: () => void
  actions: ReactNode
}) {
  const t = useT()
  return (
    <ComposerStackedRow
      icon={<RiFileEditLine className="size-3.5 text-accent-500" />}
      label={showGate ? t("sessionOps.gateSubtitle") : peek}
      peek={showGate ? peek : undefined}
      peekTestId="session-review-peek"
      meta={<DiffStat additions={additions} deletions={deletions} />}
      open={filesOpen}
      onToggle={onToggle}
      actions={actions}
    >
      <ul className="flex flex-col">
        {files.length > 0 ? (
          files.map((file) => (
            <li key={file.path}>
              <SessionFileTrigger file={file} title={file.name} onOpen={openSessionReview} />
            </li>
          ))
        ) : showGate ? (
          <li className="px-1 py-1 text-caption-2-regular text-text-tertiary">
            {t("chat.sessionReviewCommandPlaceholder")}
          </li>
        ) : null}
      </ul>
      {showGate ? (
        <GateExpanded
          chips={chips}
          canOpenPreview={canOpenPreview}
          previewBusy={previewBusy}
          onOpenPreview={onOpenPreview}
        />
      ) : null}
    </ComposerStackedRow>
  )
}

function DiffStat({ additions, deletions }: { additions: number; deletions: number }) {
  if (additions <= 0 && deletions <= 0) return null
  return (
    <span className="shrink-0 font-mono text-caption-2-semibold tabular-nums">
      {additions > 0 ? <span className="text-state-success-text">+{additions}</span> : null}
      {additions > 0 && deletions > 0 ? " " : null}
      {deletions > 0 ? <span className="text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}

function GateRowActions({
  busy,
  onReject,
  onApprove
}: {
  busy: boolean
  onReject: () => void
  onApprove: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        data-testid="review-gate-reject"
        disabled={busy}
        onClick={onReject}
        className="h-6 cursor-pointer rounded-md px-2 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary disabled:opacity-50"
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

function KeepRowActions({
  busy,
  empty,
  onUndo,
  onKeep,
  onReview
}: {
  busy: boolean
  empty: boolean
  onUndo: () => void
  onKeep: () => void
  onReview: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <RowTextButton disabled={busy || empty} onClick={onUndo}>
        {t("chat.sessionReviewUndoAll")}
      </RowTextButton>
      <RowTextButton disabled={busy || empty} onClick={onKeep}>
        {t("chat.sessionReviewKeepAll")}
      </RowTextButton>
      <button
        type="button"
        data-testid="session-review-open"
        disabled={busy}
        onClick={onReview}
        className="ml-1 flex h-6 items-center rounded-md bg-accent-500 px-2.5 text-caption-2-medium text-text-white hover:bg-accent-600 disabled:opacity-50"
      >
        {t("chat.sessionReviewOpen")}
      </button>
    </div>
  )
}

function RowTextButton({
  disabled,
  onClick,
  children
}: {
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-6 rounded-md px-2 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function GateExpanded({
  chips,
  canOpenPreview,
  previewBusy,
  onOpenPreview
}: {
  chips: TurnSourceChip[]
  canOpenPreview: boolean
  previewBusy?: boolean
  onOpenPreview: () => void
}) {
  const t = useT()
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <SessionPreviewOpenButton enabled={canOpenPreview} busy={previewBusy} onOpen={onOpenPreview} />
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => openSourcesSheet({ chips, activeId: chip.id })}
            className="cursor-pointer truncate rounded-md px-2 py-0.5 text-caption-2-medium text-text-primary ring-1 ring-border-button-default hover:bg-background-secondary-hover"
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="text-caption-2-regular text-text-tertiary">{t("sessionOps.gateHint")}</p>
    </div>
  )
}
