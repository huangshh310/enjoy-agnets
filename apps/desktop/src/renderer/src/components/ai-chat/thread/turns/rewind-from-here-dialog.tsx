/**
 * 从这条用户消息重来。异步结束前不关窗（Esc / 遮罩 / 取消都不收）；结果回来、取消、Esc 都清回第一步。
 * 文案 / 按钮按 luna 定稿（rewind-dialog-view.ts）：Git 工作区三钮、非 Git / 不知道 / 引擎不支持两钮、删新文件二次确认、
 * 还原失败分灰色兜底（什么都没改）和琥珀色 +「去审查」（只还原了一部分）。结果 → 状态走 rewindOutcome，界面不出原始错误。
 */
import { useRef, useState } from "react"
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
import {
  rewindDialogView,
  rewindOutcome,
  settleRewind,
  type RewindButtonId,
  type RewindFailure
} from "./rewind-dialog-view"

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
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [untracked, setUntracked] = useState<string[] | null | undefined>(undefined)
  const [failure, setFailure] = useState<RewindFailure | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  function reset() {
    setUntracked(undefined)
    setFailure(null)
    setErrorKey(null)
  }

  /** 取消 / Esc / 遮罩 / 去审查 / 成功：都清回第一步再关。跑着的时候不收窗。 */
  function close() {
    if (busyRef.current) return
    reset()
    onOpenChange(false)
  }

  async function run(restoreFiles: boolean, confirmDeleteUntracked?: boolean) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setErrorKey(null)
    try {
      // 抛错也收成通用失败（REWIND_THREW → 「从这里重来失败」），不留未处理的 rejection，原始错误不进界面。
      const result = await settleRewind(() =>
        rewindFromUserTurn({
          userMessageId: messageId,
          restoreFiles,
          confirmDeleteUntracked
        })
      )
      if (!result.ok && result.code !== "CHECKPOINT_CONFIRM_REQUIRED") {
        // 只打 code，原始错误不进界面。
        console.warn(`[rewind] failed: ${result.code}`)
      }
      const outcome = rewindOutcome(result, restoreFiles)
      if (outcome.kind === "close") {
        busyRef.current = false
        close()
      } else if (outcome.kind === "untracked") {
        setUntracked(outcome.files)
      } else if (outcome.kind === "failure") {
        setUntracked(undefined)
        setFailure(outcome.failure)
      } else {
        setErrorKey(outcome.messageKey)
      }
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const view = rewindDialogView(
    untracked !== undefined
      ? { kind: "untracked", files: untracked }
      : { kind: "confirm", canRestoreFiles, gitRepo, failure },
    t,
    busy
  )

  function onButton(id: RewindButtonId) {
    if (id === "cancel") close()
    else if (id === "restore-files") void run(true)
    else if (id === "delete-and-restore") void run(true, true)
    else void run(false)
  }

  function goReview() {
    // 重试跑着的时候不去审查：close() 不收窗，右栏会在弹窗背后打开（leo S1）。
    if (busyRef.current) return
    close()
    revealRightPane("review")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else close()
      }}
    >
      <DialogContent
        data-testid="rewind-dialog"
        data-state-kind={untracked !== undefined ? "untracked" : "confirm"}
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
              disabled={view.failure.reviewDisabled}
              onClick={goReview}
            >
              {view.failure.reviewLabel}
            </button>
          </div>
        ) : null}
        {errorKey ? (
          <p data-testid="rewind-error" className="mt-2 text-caption-1-medium text-text-error-primary">
            {t(errorKey)}
          </p>
        ) : null}
        <DialogFooter className="mt-2">
          {view.buttons.map((button) => (
            <Button
              key={button.id}
              data-testid={`rewind-${button.id}`}
              variant={button.variant}
              size="sm"
              disabled={busy}
              onClick={() => onButton(button.id)}
            >
              {button.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
