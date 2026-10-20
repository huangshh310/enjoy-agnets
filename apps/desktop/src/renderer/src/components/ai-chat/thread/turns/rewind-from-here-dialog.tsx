/**
 * 从这条用户消息重来。异步结束前不关窗（Esc / 遮罩 / 取消都不收）；结果回来、取消、Esc 都清回第一步。
 * 文案 / 按钮按 luna 定稿（rewind-dialog-view.ts）：Git 工作区三钮、非 Git / 不知道 / 引擎不支持两钮、删新文件二次确认、
 * 还原失败分灰色兜底（什么都没改）和琥珀色 +「去审查」（只还原了一部分）。
 * 跑 / 去审查 / 按钮的 disabled 与 onClick 都来自 rewind-dialog-controller.ts（node --test 直接测接线），这里只负责摆出来。
 */
import { useState, useSyncExternalStore } from "react"
import { RiHistoryLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { MessageAction } from "@/components/ai-elements/message"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { rewindFromUserTurn } from "@renderer/hooks/rewind-from-here"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { revealRightPane } from "../../right-pane/open-pane"
import { createRewindDialogController, type RewindDialogDeps } from "./rewind-dialog-controller"

export function RewindFromHereAction({
  messageId,
  disabled,
  canRewind
}: {
  messageId: string
  disabled: boolean
  canRewind: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <MessageAction
        tooltip={canRewind ? t("chat.rewindTitle") : t("chat.rewindUnsupported")}
        label={t("chat.rewindTitle")}
        disabled={disabled || !canRewind}
        onClick={() => canRewind && setOpen(true)}
      >
        <RiHistoryLine className="size-3.5" />
      </MessageAction>
      <RewindFromHereDialog
        open={open}
        messageId={messageId}
        canRestoreFiles={canRewind}
        onOpenChange={setOpen}
      />
    </>
  )
}

export function RewindFromHereDialog({
  open,
  messageId,
  canRestoreFiles,
  onOpenChange
}: {
  open: boolean
  messageId: string
  canRestoreFiles: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  // 审查面板同一份：workspace.changes 回来的 gitRepo；false = 明确没用 Git，null = 还不知道。
  const gitRepo = useChatStore((state) => state.gitRepo)
  const deps: RewindDialogDeps = {
    rewind: ({ restoreFiles, confirmDeleteUntracked }) =>
      rewindFromUserTurn({ userMessageId: messageId, restoreFiles, confirmDeleteUntracked }),
    onClose: () => onOpenChange(false),
    revealReview: () => revealRightPane("review")
  }
  const [controller] = useState(() => createRewindDialogController(deps))
  controller.setDeps(deps)
  useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const view = controller.model({ canRestoreFiles, gitRepo, t })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else controller.close()
      }}
    >
      <DialogContent
        data-testid="rewind-dialog"
        data-state-kind={view.stateKind}
        className="max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
      >
        <DialogHeader>
          <DialogTitle data-testid="rewind-title" className="text-title-3-semibold text-text-primary">
            {view.title}
          </DialogTitle>
          <DialogDescription data-testid="rewind-body" className="text-body-medium text-text-secondary">
            {view.body}
          </DialogDescription>
          {view.hint ? (
            <p data-testid="rewind-hint" className="text-caption-1-regular text-text-tertiary">
              {view.hint}
            </p>
          ) : null}
        </DialogHeader>
        {view.files.length > 0 ? (
          <ul data-testid="rewind-files" className="mt-1 flex flex-col gap-0.5 text-caption-1-regular text-text-secondary">
            {view.files.map((file) => (
              <li key={file} className="truncate font-mono" title={file}>
                {file}
              </li>
            ))}
            {view.moreCount > 0 ? (
              <li data-testid="rewind-files-more" className="text-text-tertiary">
                {t("chat.rewindConfirmUntrackedMore", { n: view.moreCount })}
              </li>
            ) : null}
          </ul>
        ) : null}
        {view.failure?.kind === "missing" ? (
          // 灰色兜底：什么都没改。和正文下的提示灰字拉开——带底色的小块、次级字色。
          <p
            data-testid="rewind-failure"
            data-failure-kind="missing"
            role="status"
            className="mt-1 rounded-xl bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-secondary"
          >
            {view.failure.text}
          </p>
        ) : null}
        {view.failure?.kind === "partial" ? (
          // 琥珀色：文件可能只还原了一部分，后面跟文字按钮「去审查」。
          <div
            data-testid="rewind-failure"
            data-failure-kind="partial"
            role="alert"
            className="mt-1 rounded-xl border border-status-yellow-text/25 bg-status-yellow-background/10 px-3 py-2 text-caption-1-medium text-status-yellow-text"
          >
            <span>{view.failure.text}</span>{" "}
            <button
              type="button"
              data-testid="rewind-go-review"
              className="font-semibold underline underline-offset-2 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              {...view.failure.review?.buttonProps}
            >
              {view.failure.review?.label}
            </button>
          </div>
        ) : null}
        {view.error ? (
          <p data-testid="rewind-error" className="mt-2 text-caption-1-medium text-text-error-primary">
            {view.error}
          </p>
        ) : null}
        <DialogFooter className="mt-2">
          {view.buttons.map((button) => (
            <Button
              key={button.id}
              data-testid={`rewind-${button.id}`}
              variant={button.variant}
              size="sm"
              {...button.buttonProps}
            >
              {button.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
