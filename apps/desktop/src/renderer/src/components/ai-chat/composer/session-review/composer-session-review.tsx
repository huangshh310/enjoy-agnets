/**
 * Composer 上方本轮改动条：文件列表 + 顶边跳动宠物。
 * Keep 收下改动并隐藏；Undo 确认后 git restore 再隐藏。
 */
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { describeReviewFiles } from "./collect-session-files"
import { openSessionReview } from "./open-session-review"
import { SessionMascotRunner } from "./session-mascot-runner"
import { SessionReviewBar } from "./session-review-bar"
import {
  reviewFilesKey,
  sessionReviewVisible,
  shouldExpandReviewFiles
} from "./session-review-visible"
import type { SessionReviewFile } from "./session-review.types"

export function ComposerSessionReview() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const changes = useChatStore((state) => state.changes)
  const running = useChatStore((state) => state.running)
  const runStartedAt = useChatStore((state) => state.runStartedAt)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const dismissedKey = useChatStore((state) => state.sessionReviewDismissedKey)
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const pick = useMemo(
    () => describeReviewFiles(pathsFromLastTurn(messages), changes, running),
    [messages, changes, running]
  )
  const files = pick.files
  const filesKey = useMemo(() => reviewFilesKey(files.map((file) => file.path)), [files])

  if (!sessionReviewVisible(files.length, running, dismissedKey, filesKey, messages.length)) return null

  return (
    <div className="relative z-20 mb-1.5 w-full animate-in fade-in-50 duration-200">
      <div
        data-session-review
        className="relative flex w-full flex-col overflow-visible rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-1.5 shadow-2xs backdrop-blur-md"
      >
        {running ? <SessionMascotRunner active={running} /> : null}
        <SessionReviewBar
          files={files}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          modelLabel={modelLabel}
          busy={busy}
          hasFiles={files.length > 0}
          defaultExpanded={shouldExpandReviewFiles(pick.fromLastTurn, files.length)}
          onOpenReview={() => openSessionReview()}
          onOpenFile={(path) => openSessionReview(path)}
          onKeep={() => keepSessionReview(filesKey)}
          onUndo={() => setUndoOpen(true)}
        />
      </div>
      <ConfirmDialog
        open={undoOpen}
        destructive
        title={t("chat.sessionReviewUndoConfirmTitle")}
        description={t("chat.sessionReviewUndoConfirmDesc", { n: files.length })}
        confirmLabel={t("chat.sessionReviewUndoAll")}
        onOpenChange={setUndoOpen}
        onConfirm={() => void undoSessionReview(files, filesKey, queryClient, setBusy, t)}
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

