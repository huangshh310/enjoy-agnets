/**
 * Composer 上方本轮改动条：文件列表 + 顶边跳动宠物。
 * Keep 收下改动并隐藏；Undo 确认后 git restore 再隐藏。
 */
import { useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { collectSessionFiles } from "./collect-session-files"
import { openSessionReview } from "./open-session-review"
import { SessionMascotRunner } from "./session-mascot-runner"
import { SessionReviewBar } from "./session-review-bar"
import { reviewFilesKey, sessionReviewVisible } from "./session-review-visible"
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
  const boxRef = useRef<HTMLDivElement>(null)
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const files = useMemo(() => collectReviewFiles(messages, changes), [messages, changes])
  const filesKey = useMemo(() => reviewFilesKey(files.map((file) => file.path)), [files])

  if (!sessionReviewVisible(files.length, running, dismissedKey, filesKey)) return null

  return (
    <div className="relative z-20 mb-1.5 w-full animate-in fade-in-50 duration-200">
      <div
        ref={boxRef}
        data-session-review
        className="relative flex w-full flex-col rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-1.5 shadow-2xs backdrop-blur-md"
      >
        {running ? (
          <div className="pointer-events-none absolute -top-[18px] left-0 right-0 z-30 h-0 overflow-visible">
            <SessionMascotRunner boxRef={boxRef} active={running} />
          </div>
        ) : null}
        <SessionReviewBar
          files={files}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          modelLabel={modelLabel}
          busy={busy}
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
        onConfirm={() => void undoSessionReview(files, filesKey, queryClient, setBusy)}
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
  setBusy: (busy: boolean) => void
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
    useChatStore.getState().setError(error instanceof Error ? error.message : String(error))
  } finally {
    setBusy(false)
  }
}

function collectReviewFiles(
  messages: Parameters<typeof pathsFromLastTurn>[0],
  changes: Parameters<typeof collectSessionFiles>[1]
): SessionReviewFile[] {
  const lastTurnPaths = pathsFromLastTurn(messages)
  if (lastTurnPaths.length > 0) return collectSessionFiles(lastTurnPaths, changes)
  return changes.map((row) => ({
    path: row.path,
    name: row.path.split(/[\\/]/).pop() || row.path,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0
  }))
}
