import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RiGlobeLine } from "@remixicon/react"
import { TaskList } from "@/components/ai-elements/task-list"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { continueTodoTurn } from "@renderer/hooks/continue-todo-turn"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { latestSessionTodoList } from "../thread/tool-surfaces/select-turn-tool-surfaces"
import { useSessionReviewModel } from "./session-review/use-session-review-model"
import { useOpenSessionPreview } from "./session-review/preview-open/use-open-session-preview"
import { previewTargetLabel } from "./session-review/preview-open/pick-preview-target"
import { usePreviewUrlReachable } from "./session-review/preview-open/use-preview-url-reachable"
import { openBrowserUrl } from "../right-pane/open-pane"
import { openSessionReview } from "./session-review/open-session-review"
import { keepSessionReview, undoSessionReview } from "./session-review/composer-session-review"
import { SessionReviewBar } from "./session-review/session-review-bar"
import { shouldExpandReviewFiles } from "./session-review/session-review-visible"
import { useComposerActiveModelLabel } from "@renderer/components/ai-chat/agent-picker/use-composer-active-model"
import { SessionMascotRunner } from "./session-review/session-mascot-runner"

export function ComposerTodoDock() {
  const t = useT()
  const queryClient = useQueryClient()
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const runStartedAt = useChatStore((state) => state.runStartedAt)
  const waitingApproval = Boolean(useChatStore((state) => state.pendingApproval))
  const modelLabel = useComposerActiveModelLabel()
  const todos = latestSessionTodoList(messages)
  const reviewModel = useSessionReviewModel()
  const preview = useOpenSessionPreview()
  const [undoOpen, setUndoOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const previewUrl = reviewModel.slimTarget?.kind === "url" ? reviewModel.slimTarget.url : null
  const isUrlReachable = usePreviewUrlReachable(previewUrl)

  if (!todos || todos.tasks.length === 0) return null

  const allCompleted = todos.tasks.every(
    (item) => (typeof item === "string" ? false : item.status === "completed")
  )

  function continueOpenTodos() {
    void continueTodoTurn()
  }

  function handleOpenPreview() {
    const target = reviewModel.slimTarget
    if (!target) return
    if (target.kind === "url") {
      openBrowserUrl(target.url)
      return
    }
    void preview.open(target)
  }

  // 仅在目标为本地 HTML 或服务端口已真实启动可访问时才显示预览入口，杜绝假绿灯
  const showPreviewPill =
    reviewModel.slimTarget != null &&
    (reviewModel.slimTarget.kind === "html" || isUrlReachable)

  const previewAction = showPreviewPill ? (
    <button
      type="button"
      onClick={handleOpenPreview}
      disabled={preview.busy}
      title={`${t("chat.sessionReviewOpenPreview")}: ${previewTargetLabel(reviewModel.slimTarget!)}`}
      className="inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default/90 px-2.5 text-caption-2-medium text-text-primary transition-all hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 disabled:opacity-50 select-none shadow-2xs"
    >
      <RiGlobeLine className="size-3 text-accent-500 shrink-0" />
      <span className="size-1.5 rounded-full bg-state-success-base animate-pulse shrink-0" />
      <span className="max-w-[140px] truncate font-mono text-caption-2-medium text-text-primary">
        {previewTargetLabel(reviewModel.slimTarget!)}
      </span>
      <span className="text-caption-2-regular text-text-tertiary">·</span>
      <span className="text-text-secondary">{t("chat.sessionReviewOpenPreview")}</span>
    </button>
  ) : null

  // 当同时有未决文件修改时，内嵌在同一个控制舱底部，保留完整的可展开/收起查看文件列表与 diff
  const reviewFooter =
    reviewModel.showReview && reviewModel.files.length > 0 ? (
      <div className="bg-background-secondary-default/50 px-3.5 py-1.5">
        <SessionReviewBar
          files={reviewModel.files}
          running={running}
          runStartedAt={runStartedAt ?? undefined}
          waitingApproval={waitingApproval}
          modelLabel={modelLabel}
          busy={busy}
          hasFiles={reviewModel.files.length > 0}
          canOpenPreview={false}
          previewBusy={preview.busy}
          defaultExpanded={shouldExpandReviewFiles(
            reviewModel.pick.fromLastTurn,
            reviewModel.files.length
          )}
          onOpenReview={() => openSessionReview()}
          onOpenFile={(path) => openSessionReview(path)}
          onOpenPreview={() => {}}
          onKeep={() => keepSessionReview(reviewModel.filesKey)}
          onUndo={() => setUndoOpen(true)}
        />
      </div>
    ) : null

  return (
    <div className="relative w-full min-w-0">
      {running ? <SessionMascotRunner active={running} /> : null}
      <TaskList
        fused
        title={todos.title ?? t("chat.todos")}
        tasks={todos.tasks}
        variant="dock"
        defaultCollapsed={allCompleted}
        live={running}
        action={previewAction}
        footer={reviewFooter}
        onContinue={running || allCompleted ? undefined : continueOpenTodos}
      />
      <ConfirmDialog
        open={undoOpen}
        destructive
        title={t("chat.sessionReviewUndoConfirmTitle")}
        description={t("chat.sessionReviewUndoConfirmDesc", { n: reviewModel.files.length })}
        confirmLabel={t("chat.sessionReviewUndoAll")}
        onOpenChange={setUndoOpen}
        onConfirm={() =>
          void undoSessionReview(
            reviewModel.files,
            reviewModel.filesKey,
            queryClient,
            setBusy,
            t
          )
        }
      />
    </div>
  )
}

