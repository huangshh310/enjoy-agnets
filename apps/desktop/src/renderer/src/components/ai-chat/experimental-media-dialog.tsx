/**
 * 开启实验媒体的确认框。视频 / Realtime 不是失败，不要画成会话 error 条。
 */
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"


export function ExperimentalMediaDialog({
  open,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <ConfirmDialog
      open={open}
      title={t("chat.enableMedia")}
      description={t("chat.enableMediaHint")}
      confirmLabel={t("chat.enable")}
      cancelLabel={t("common.cancel")}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  )
}
