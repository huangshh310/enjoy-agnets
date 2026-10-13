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
import { GateCompactHint, GateCompactPeek, GateExpanded, GateRowActions } from "./composer-review-gate-parts"
import { SessionPreviewOpenButton } from "../session-review/preview-open/session-preview-open-button"
import { STACKED_PANEL_CLASS_NAME } from "./composer-stacked-styles"
import { keepSessionReview, undoSessionReview } from "../session-review/composer-session-review"
import { SessionFileTrigger } from "../session-review/session-review-files"
import { openSessionReview } from "../session-review/open-session-review"
import { useSessionReviewModel } from "../session-review/use-session-review-model"
import { useOpenSessionPreview } from "../session-review/preview-open/use-open-session-preview"
import { usePreviewUrlReachable } from "../session-review/preview-open/use-preview-url-reachable"
import { chipsFromLastAssistant } from "../../review-gate/review-gate-card"
import { approveReviewGate, rejectReviewGate } from "../../review-gate/review-gate-actions"
import { lastAssistantTurn } from "../../run-ledger/collect-run-ledger"
import type { TurnSourceChip } from "../../thread/sources/source-chip"
import { reviewBannerPeek } from "../session-review/review-banner-peek"
import { reviewPlaceholderKey, reviewPlaceholderKind } from "../session-review/review-placeholder-kind"
import type { SessionReviewFile } from "../session-review/session-review.types"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"

export function ComposerLiveChanges() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const error = useChatStore((state) => state.error)
  const notice = useChatStore((state) => state.notice)
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
  // 运行中还没改到文件：不画「改动 · 全部撤销/全部保留/审查」空条（luna P2）。
  const idleRunning = running && model.files.length === 0
  if (!showGate && (!model.showReview || idleRunning)) return null

  const files = model.files
  const additions = files.reduce((sum, file) => sum + file.additions, 0)
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0)
  const stopped =
    !running &&
    (classifyThreadError(notice ?? "") === "stopped" || classifyThreadError(error ?? "") === "stopped")
  const interrupted = stopped || isRestoreFamilyCode(notice)
  const placeholderKey = reviewPlaceholderKey(
    reviewPlaceholderKind(lastAssistantTurn(messages)?.tools ?? [], interrupted)
  )
  const peek = reviewBannerPeek(
    files,
    {
      stopped,
      placeholder: showGate,
      maybeChanged: interrupted && files.length === 0,
      placeholderKey,
      wroteThisTurnOnly: model.pick.wroteThisTurnOnly
    },
    t
  )
  const chips = chipsFromLastAssistant(lastAssistantTurn(messages), (name) =>
    t("chat.sourceSkillLabel", { name })
  )

  return (
    <div
      data-testid={showGate ? "review-gate-card" : "composer-live-changes"}
      className={`${STACKED_PANEL_CLASS_NAME} flex min-h-0 flex-col`}
    >
      <LiveChangesRow
        showGate={showGate}
        peek={peek}
        additions={additions}
        deletions={deletions}
        filesOpen={filesOpen}
        onToggle={() => setFilesOpen((open) => !open)}
        files={files}
        placeholderKey={placeholderKey}
        chips={chips}
        actions={
          <div className="flex shrink-0 items-center gap-1">
            {/* 收起态也露出「在浏览器打开」，不要求先展开文件列表（jojo #151 P3）。 */}
            {canOpenPreview ? (
              <SessionPreviewOpenButton
                enabled
                busy={preview.busy}
                onOpen={() => model.previewTarget && void preview.open(model.previewTarget)}
              />
            ) : null}
            {showGate ? (
              <GateRowActions
                busy={busy}
                onReview={() => expandInspector("review")}
                onReject={() =>
                  void rejectReviewGate(sessionId, {
                    placeholder: t("sessionOps.rejectPlaceholder"),
                    toast: t("sessionOps.rejectedToast")
                  })
                }
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
            )}
          </div>
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
  placeholderKey,
  chips,
  actions
}: {
  showGate: boolean
  peek: string
  additions: number
  deletions: number
  filesOpen: boolean
  onToggle: () => void
  files: SessionReviewFile[]
  placeholderKey: string
  chips: TurnSourceChip[]
  actions: ReactNode
}) {
  const t = useT()
  return (
    <ComposerStackedRow
      icon={<RiFileEditLine className="size-3.5 text-accent-500" />}
      label={showGate ? t("sessionOps.gateSubtitle") : peek}
      peek={showGate ? `· ${peek}` : undefined}
      peekTestId="session-review-peek"
      shortOpenPeek={showGate ? <GateCompactPeek files={files} placeholderKey={placeholderKey} /> : undefined}
      shortOpenBelow={showGate ? <GateCompactHint /> : undefined}
      meta={<DiffStat additions={additions} deletions={deletions} />}
      open={filesOpen}
      onToggle={onToggle}
      actions={actions}
    >
      {showGate ? (
        <GateExpanded
          files={files}
          placeholderKey={placeholderKey}
          chips={chips}
          onOpenFile={openSessionReview}
        />
      ) : (
        <ul className="flex flex-col">
          {files.map((file) => (
            <li key={file.path}>
              <SessionFileTrigger file={file} title={file.name} onOpen={openSessionReview} />
            </li>
          ))}
        </ul>
      )}
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
