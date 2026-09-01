/**
 * 开启实验媒体的确认框。视频 / Realtime 不是失败，不要画成会话 error 条。
 */
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"

export function ExperimentalMediaDialog({
  open,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Enable experimental media?"
      description="Video generation is experimental. Enable it to continue. You can turn this off later in Settings → Media & assets."
      confirmLabel="Enable"
      cancelLabel="Cancel"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  )
}
