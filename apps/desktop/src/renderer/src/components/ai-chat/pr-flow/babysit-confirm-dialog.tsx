/**
 * 盯 PR 开盯 / 停盯短确认卡（同家族）。禁静默开盯。
 */
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { SETTINGS_DRAWER_Z_CLASS } from "@renderer/components/settings/settings-overlay"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

export function BabysitStartConfirmDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  error?: string | null
  onConfirm: () => Promise<void> | void
}) {
  const t = useT()
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="babysit-start-confirm"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none"
        )}
      >
        <div className="w-full max-w-sm rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
          <DialogHeader className="mb-3 space-y-1 text-left">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              {t("chat.prBabysitStartTitle")}
            </DialogTitle>
            <DialogDescription className="text-caption-1-medium text-text-secondary">
              {t("chat.prBabysitStartSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <p className="mb-3 text-caption-2-medium text-text-tertiary">{t("chat.prBabysitStartFootnote")}</p>
          {props.error ? (
            <p data-testid="babysit-start-error" className="mb-3 text-caption-1-medium text-text-error-primary">
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
              type="button"
              size="sm"
              data-testid="babysit-start-confirm-btn"
              disabled={props.busy}
              onClick={() => void props.onConfirm()}
            >
              {t("chat.prBabysitStartAction")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BabysitStopConfirmDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onConfirm: () => Promise<void> | void
}) {
  const t = useT()
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="babysit-stop-confirm"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none"
        )}
      >
        <div className="w-full max-w-sm rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
          <DialogHeader className="mb-3 space-y-1 text-left">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              {t("chat.prBabysitStopTitle")}
            </DialogTitle>
            <DialogDescription className="text-caption-1-medium text-text-secondary">
              {t("chat.prBabysitStopBody")}
            </DialogDescription>
          </DialogHeader>
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
              type="button"
              size="sm"
              variant="destructive"
              data-testid="babysit-stop-confirm-btn"
              disabled={props.busy}
              onClick={() => void props.onConfirm()}
            >
              {t("chat.prBabysitStopAction")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
