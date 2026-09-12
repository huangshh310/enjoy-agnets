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
import { SessionPreviewToast } from "./preview-open/session-preview-toast"
import { useOpenSessionPreview } from "./preview-open/use-open-session-preview"
import { SessionMascotRunner } from "./session-mascot-runner"
import { SessionReviewBar } from "./session-review-bar"
import { shouldExpandReviewFiles } from "./session-review-visible"
import { useSessionReviewModel } from "./use-session-review-model"
import type { SessionReviewFile } from "./session-review.types"

export function ComposerSessionReview() {
  const t = useT()
  const queryClient = useQueryClient()
  const running = useChatStore((state) => state.running)
  const runStartedAt = useChatStore((state) => state.runStartedAt)
  const modelLabel = useComposerActiveModelLabel()
  const model = useSessionReviewModel()
  const preview = useOpenSessionPreview()
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!model.showReview && !model.showSlim) return null

  return (
    <div className="relative z-20 mb-1.5 w-full animate-in fade-in-50 duration-200">
      <SessionPreviewToast visible={preview.opened} />
      {model.showReview ? (
        <ReviewCard
          files={model.files}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          modelLabel={modelLabel}
          busy={busy}
          canOpenPreview={model.previewTarget != null}
          previewBusy={preview.busy}
          defaultExpanded={shouldExpandReviewFiles(model.pick.fromLastTurn, model.files.length)}
          onOpenPreview={() => model.previewTarget && void preview.open(model.previewTarget)}
          onKeep={() => keepSessionReview(model.filesKey)}
          onUndo={() => setUndoOpen(true)}
        />
      ) : model.slimTarget ? (
        <SessionPreviewStrip
          target={model.slimTarget}
          busy={preview.busy}
          onOpen={() => {
            const target = model.slimTarget
            if (target) void preview.open(target)
          }}
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
  running,
  runStartedAt,
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
  running: boolean
  runStartedAt?: number
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
      className="relative flex w-full flex-col overflow-visible rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-1.5 shadow-2xs backdrop-blur-md"
    >
      {running ? <SessionMascotRunner active={running} /> : null}
      <SessionReviewBar
        files={files}
        running={running}
        runStartedAt={runStartedAt}
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

function keepSessionReview(filesKey: string) {
  useChatStore.getState().setSessionReviewDismissedKey(filesKey)
}

async function undoSessionReview(
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
