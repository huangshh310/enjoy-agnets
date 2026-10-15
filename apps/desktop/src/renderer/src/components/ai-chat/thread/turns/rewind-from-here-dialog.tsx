/**
 * 从这条用户消息重来。异步结束前不关窗；失败码留在对话框里。
 * 文案 / 按钮按 luna 定稿（rewind-dialog-view.ts）：Git 工作区三钮、非 Git 两钮、删新文件二次确认、还原失败灰字兜底。
 */
import { useState } from "react"
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
import { isRewindRestoreFailure, rewindDialogView, type RewindButtonId } from "./rewind-dialog-view"

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
  // 审查面板同一份：workspace.changes 回来的 gitRepo；false = 这个文件夹没用 Git 管理。
  const gitRepo = useChatStore((state) => state.gitRepo)
  const [busy, setBusy] = useState(false)
  const [untracked, setUntracked] = useState<string[] | null | undefined>(undefined)
  const [restoreFailed, setRestoreFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setUntracked(undefined)
    setRestoreFailed(false)
    setError(null)
  }

  async function run(restoreFiles: boolean, confirmDeleteUntracked?: boolean) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await rewindFromUserTurn({
        userMessageId: messageId,
        restoreFiles,
        confirmDeleteUntracked
      })
      if (!result.ok && result.code === "CHECKPOINT_CONFIRM_REQUIRED") {
        // 拿不到名单时 N 未知：标题换成不带数字的说法。
        setUntracked(result.untrackedToDelete && result.untrackedToDelete.length > 0 ? result.untrackedToDelete : null)
        return
      }
      if (!result.ok && restoreFiles && isRewindRestoreFailure(result.code)) {
        setUntracked(undefined)
        setRestoreFailed(true)
        return
      }
      if (!result.ok) {
        setError(rewindErrorMessage(result.code, t))
        return
      }
      onOpenChange(false)
      reset()
    } finally {
      setBusy(false)
    }
  }

  const view = rewindDialogView(
    untracked !== undefined
      ? { kind: "untracked", files: untracked }
      : { kind: "confirm", canRestoreFiles, gitRepo, restoreFailed },
    t
  )

  function onButton(id: RewindButtonId) {
    if (id === "cancel") onOpenChange(false)
    else if (id === "restore-files") void run(true)
    else if (id === "delete-and-restore") void run(true, true)
    else void run(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
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
        {view.failure ? (
          <p data-testid="rewind-failure" className="mt-1 text-caption-1-regular text-text-tertiary">
            {view.failure}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-caption-1-medium text-text-error-primary">{error}</p> : null}
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

function rewindErrorMessage(code: string, t: (key: string) => string): string {
  if (code.includes("REWIND_BUSY")) return t("chat.rewindBusy")
  if (code.includes("REWIND_PROVIDER_UNSUPPORTED")) return t("chat.rewindUnsupported")
  if (code.includes("TRUNCATE_MESSAGE_NOT_FOUND")) return t("chat.rewindTruncateMissing")
  if (code.includes("TRUNCATE_STALE_SNAPSHOT")) return t("chat.truncateStaleSnapshot")
  if (code.includes("TRUNCATE_TAIL_CHANGED")) return t("chat.truncateTailChanged")
  if (code.includes("TRUNCATE_RUN_ACTIVE")) return t("chat.truncateRunActive")
  if (isRewindRestoreFailure(code)) return t("chat.rewindNoCheckpoint")
  return t("chat.rewindFailed")
}
