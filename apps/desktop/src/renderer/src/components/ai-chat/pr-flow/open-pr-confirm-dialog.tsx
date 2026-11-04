/**
 * 开拉取请求确认卡：标题/描述可编辑；主钮确认后才调 create IPC（Must#2）。
 * 禁静默 gh pr create；失败人话 + 可重试；禁空成功 toast。
 */
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { SETTINGS_DRAWER_Z_CLASS } from "@renderer/components/settings/settings-overlay"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function OpenPrConfirmDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draftTitle: string
  draftBody: string
  busy?: boolean
  error?: string | null
  onConfirm: (title: string, body: string) => Promise<void> | void
}) {
  const t = useT()
  const [title, setTitle] = useState(props.draftTitle)
  const [body, setBody] = useState(props.draftBody)

  useEffect(() => {
    if (!props.open) return
    setTitle(props.draftTitle)
    setBody(props.draftBody)
  }, [props.open, props.draftTitle, props.draftBody])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="open-pr-confirm-dialog"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none"
        )}
      >
        <form
          className="w-full max-w-lg rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (!title.trim() || props.busy) return
            void props.onConfirm(title.trim(), body)
          }}
        >
          <DialogHeader className="mb-3 space-y-1 text-left">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              {t("chat.prOpenConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-caption-1-medium text-text-secondary">
              {t("chat.prOpenHint")}
            </DialogDescription>
          </DialogHeader>

          <label className="mb-1 block text-caption-2-medium text-text-tertiary">
            {t("chat.prDraftTitleLabel")}
          </label>
          <Input
            data-testid="open-pr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={props.busy}
            className="mb-3"
          />

          <label className="mb-1 block text-caption-2-medium text-text-tertiary">
            {t("chat.prDraftBodyLabel")}
          </label>
          <Textarea
            data-testid="open-pr-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={props.busy}
            rows={6}
            className="mb-3 min-h-28 resize-y"
          />

          {props.error ? (
            <p data-testid="open-pr-error" className="mb-3 text-caption-1-medium text-text-error-primary">
              {props.error}
            </p>
          ) : null}

          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.busy}
              onClick={() => props.onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              data-testid="open-pr-confirm"
              disabled={props.busy || !title.trim()}
            >
              {props.busy ? t("chat.prOpening") : t("chat.prOpenAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
