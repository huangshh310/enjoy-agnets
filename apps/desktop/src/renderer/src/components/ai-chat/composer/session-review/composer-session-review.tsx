/**
 * Composer 上方本轮改动条：文件列表 + 顶边跳动宠物。
 * Keep 收下改动并隐藏；Undo 确认后 git restore 再隐藏。
 * 次级「在浏览器打开」走系统浏览器，不嵌 Chromium。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { useComposerActiveModelLabel } from "@renderer/components/ai-chat/agent-picker/use-composer-active-model"
import { useChatStore } from "@renderer/stores/chat-store"
import { openSessionReview } from "./open-session-review"
import { SessionPreviewStrip } from "./preview-open/session-preview-strip"
import { useOpenSessionPreview } from "./preview-open/use-open-session-preview"
import { SessionMascotRunner } from "./session-mascot-runner"
import { SessionReviewBar } from "./session-review-bar"
import { shouldExpandReviewFiles } from "./session-review-visible"
import { useSessionReviewModel } from "./use-session-review-model"
import { usePreviewUrlReachable } from "./preview-open/use-preview-url-reachable"
import type { SessionReviewFile } from "./session-review.types"
import { latestSessionTodoList } from "../../thread/tool-surfaces/select-turn-tool-surfaces"
import { ReviewGateCard, chipsFromLastAssistant } from "../../review-gate/review-gate-card"
import { approveReviewGate, rejectReviewGate } from "../../review-gate/review-gate-actions"
import { lastAssistantTurn } from "../../run-ledger/collect-run-ledger"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { reviewPlaceholderKey, reviewPlaceholderKind } from "./review-placeholder-kind"

export function ComposerSessionReview() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const runStartedAt = useChatStore((state) => state.runStartedAt)
  const waitingApproval = Boolean(useChatStore((state) => state.pendingApproval))
  const modelLabel = useComposerActiveModelLabel()
  const model = useSessionReviewModel()
  const preview = useOpenSessionPreview()
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dismissedSlim, setDismissedSlim] = useState(false)

  const sessionId = useChatStore((state) => state.sessionId)
  const todos = latestSessionTodoList(messages)
  const hasTodos = Boolean(todos && todos.tasks.length > 0)
  const showGate = model.needsReview && !running
  const notice = useChatStore((state) => state.notice)
  const placeholderKey = reviewPlaceholderKey(
    reviewPlaceholderKind(lastAssistantTurn(messages)?.tools ?? [], isRestoreFamilyCode(notice))
  )

  const previewUrl = model.previewTarget?.kind === "url" ? model.previewTarget.url : null
  const isPreviewReachable = usePreviewUrlReachable(previewUrl)
  const canOpenPreview =
    model.previewTarget != null &&
    (model.previewTarget.kind === "html" || isPreviewReachable)

  const slimUrl = model.slimTarget?.kind === "url" ? model.slimTarget.url : null
  const isSlimReachable = usePreviewUrlReachable(slimUrl)
  const showSlim =
    model.slimTarget != null &&
    (model.slimTarget.kind === "html" || isSlimReachable)

  // 待验收闸优先于 Todo 合层；其它情况仍避免与 TodoDock 叠两张卡。
  if (hasTodos && !showGate) return null
  if (!showGate && !model.showReview && !showSlim) return null

  return (
    <div className="relative w-full min-w-0">
      {showGate ? (
        <ReviewGateCard
          files={model.files}
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
          placeholderKey={placeholderKey}
        />
      ) : model.showReview ? (
        <ReviewCard
          files={model.files}
          placeholderKey={placeholderKey}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          waitingApproval={waitingApproval}
          modelLabel={modelLabel}
          busy={busy}
          canOpenPreview={canOpenPreview}
          previewBusy={preview.busy}
          defaultExpanded={shouldExpandReviewFiles(model.pick.fromLastTurn, model.files.length)}
          onOpenPreview={() => model.previewTarget && void preview.open(model.previewTarget)}
          onKeep={() => keepSessionReview(model.filesKey)}
          onUndo={() => setUndoOpen(true)}
        />
      ) : model.slimTarget && !dismissedSlim && showSlim ? (
        <SessionPreviewStrip
          target={model.slimTarget}
          busy={preview.busy}
          onOpen={() => {
            const target = model.slimTarget
            if (target) void preview.open(target)
          }}
          onDismiss={() => setDismissedSlim(true)}
        />
      ) : null}
      <ConfirmDialog
        open={undoOpen}
        destructive
        title={t("chat.sessionReviewUndoConfirmTitle")}
        description={t("chat.sessionReviewUndoConfirmDesc", { n: model.files.length })}
        confirmLabel={t("chat.sessionReviewUndoAll")}
        onOpenChange={setUndoOpen}
        onConfirm={() => void undoSessionReview(model.files, model.filesKey, queryClient, setBusy, t)}
      />
    </div>
  )
}

function ReviewCard({
  files,
  placeholderKey,
  running,
  runStartedAt,
  waitingApproval,
  modelLabel,
  busy,
  canOpenPreview,
  previewBusy,
  defaultExpanded,
  onOpenPreview,
  onKeep,
  onUndo
}: {
  files: SessionReviewFile[]
  placeholderKey: string
  running: boolean
  runStartedAt?: number
  waitingApproval?: boolean
  modelLabel: string
  busy: boolean
  canOpenPreview: boolean
  previewBusy: boolean
  defaultExpanded: boolean
  onOpenPreview: () => void
  onKeep: () => void
  onUndo: () => void
}) {
  return (
    <div
      data-session-review
      data-frost="tile"
      className="relative flex w-full flex-col overflow-visible border-b border-separator-border/70 px-3.5 py-1.5"
    >
      {running ? <SessionMascotRunner active={running} /> : null}
      <SessionReviewBar
        files={files}
        placeholderKey={placeholderKey}
        running={running}
        runStartedAt={runStartedAt}
        waitingApproval={waitingApproval}
        modelLabel={modelLabel}
        busy={busy}
        hasFiles={files.length > 0}
        canOpenPreview={canOpenPreview}
        previewBusy={previewBusy}
        defaultExpanded={defaultExpanded}
        onOpenReview={() => openSessionReview()}
        onOpenFile={(path) => openSessionReview(path)}
        onOpenPreview={onOpenPreview}
        onKeep={onKeep}
        onUndo={onUndo}
      />
    </div>
  )
}

export function keepSessionReview(filesKey: string) {
  useChatStore.getState().setSessionReviewDismissedKey(filesKey)
}

export async function undoSessionReview(
  files: SessionReviewFile[],
  filesKey: string,
  queryClient: ReturnType<typeof useQueryClient>,
  setBusy: (busy: boolean) => void,
  t: ReturnType<typeof useT>
) {
  const workspaceId = useChatStore.getState().workspaceId
  if (!workspaceId || files.length === 0) return
  setBusy(true)
  try {
    await getIde().workspace.gitRestore({
      workspaceId,
      paths: files.map((file) => file.path)
    })
    useChatStore.getState().setSessionReviewDismissedKey(filesKey)
    await queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    const message = raw.includes("RESTORE_NOTHING_MATCHED")
      ? t("chat.sessionReviewRestoreEmpty")
      : raw
    useChatStore.getState().setError(message)
  } finally {
    setBusy(false)
  }
}
