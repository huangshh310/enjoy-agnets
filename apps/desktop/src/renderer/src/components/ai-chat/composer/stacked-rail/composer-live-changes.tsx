/**
 * 本轮改动：输入框上方一行「n 个文件」+ 审查。不进输入壳。
 */
import { useState } from "react"
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
import { ReviewGateCard, chipsFromLastAssistant } from "../../review-gate/review-gate-card"
import { approveReviewGate, rejectReviewGate } from "../../review-gate/review-gate-actions"
import { lastAssistantTurn } from "../../run-ledger/collect-run-ledger"

export function ComposerLiveChanges() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const sessionId = useChatStore((state) => state.sessionId)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
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
  const peek =
    files.length > 0
      ? t("chat.stackedFilesChanged", { n: files.length })
      : t("chat.environmentChanges")

  return (
    <div data-testid="composer-live-changes" className={STACKED_PANEL_CLASS_NAME}>
      {showGate ? (
        <div className="px-2 py-1.5">
          <ReviewGateCard
            files={files}
            chips={chipsFromLastAssistant(lastAssistantTurn(messages), (name) =>
              t("chat.sourceSkillLabel", { name })
            )}
            canOpenPreview={canOpenPreview}
            previewBusy={preview.busy}
            busy={busy}
            onOpenPreview={() => model.previewTarget && void preview.open(model.previewTarget)}
            onOpenFile={(path) => openSessionReview(path)}
            onReject={() => void rejectReviewGate(sessionId)}
            onApprove={() => void approveReviewGate(sessionId, model.filesKey)}
          />
        </div>
      ) : (
        <ComposerStackedRow
          icon={<RiFileEditLine className="size-3.5" />}
          label={peek}
          meta={<DiffStat additions={additions} deletions={deletions} />}
          open={filesOpen}
          onToggle={() => setFilesOpen((next) => !next)}
          actions={
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                disabled={busy || files.length === 0}
                onClick={() => setUndoOpen(true)}
                className="h-6 rounded-md px-2 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary disabled:opacity-50"
              >
                {t("chat.sessionReviewUndoAll")}
              </button>
              <button
                type="button"
                disabled={busy || files.length === 0}
                onClick={() => keepSessionReview(model.filesKey)}
                className="h-6 rounded-md px-2 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary disabled:opacity-50"
              >
                {t("chat.sessionReviewKeepAll")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => expandInspector("review")}
                className="ml-1 flex h-6 items-center rounded-md bg-accent-500 px-2.5 text-caption-2-medium text-text-white hover:bg-accent-600 disabled:opacity-50"
              >
                {t("chat.sessionReviewOpen")}
              </button>
            </div>
          }
        >
          <ul className="flex flex-col">
            {files.map((file) => (
              <li key={file.path}>
                <SessionFileTrigger file={file} title={file.name} onOpen={openSessionReview} />
              </li>
            ))}
          </ul>
        </ComposerStackedRow>
      )}
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
