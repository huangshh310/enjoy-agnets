/**
 * 从这条用户消息重来。异步结束前不关窗；失败码留在对话框里。
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
  const [busy, setBusy] = useState(false)
  const [untracked, setUntracked] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        setUntracked(result.untrackedToDelete ?? [])
        return
      }
      if (!result.ok) {
        setError(rewindErrorMessage(result.code, t))
        return
      }
      onOpenChange(false)
      setUntracked(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setUntracked(null)
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {untracked ? t("chat.rewindConfirmUntrackedTitle") : t("chat.rewindTitle")}
          </DialogTitle>
          <DialogDescription className="text-body-medium text-text-secondary">
            {untracked
              ? t("chat.rewindConfirmUntrackedBody", { n: untracked.length })
              : canRestoreFiles
                ? t("chat.rewindBody")
                : t("chat.rewindBodyChatOnly")}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="mt-2 text-caption-1-medium text-text-error-primary">{error}</p> : null}
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          {untracked ? (
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void run(true, true)}>
              {t("chat.rewindRestoreFiles")}
            </Button>
          ) : (
            <>
              {canRestoreFiles ? (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(true)}>
                  {t("chat.rewindRestoreFiles")}
                </Button>
              ) : null}
              <Button size="sm" disabled={busy} onClick={() => void run(false)}>
                {t("chat.rewindChatOnly")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function rewindErrorMessage(code: string, t: (key: string) => string): string {
  if (code.includes("REWIND_BUSY")) return t("chat.rewindBusy")
  if (code.includes("REWIND_PROVIDER_UNSUPPORTED")) return t("chat.rewindUnsupported")
  if (code.includes("REWIND_NO_CHECKPOINT")) return t("chat.rewindNoCheckpoint")
  if (code.includes("TRUNCATE_MESSAGE_NOT_FOUND")) return t("chat.rewindTruncateMissing")
  if (code.includes("CHECKPOINT")) return t("chat.reviewCheckpointRestoreFailed")
  return t("chat.rewindFailed")
}
