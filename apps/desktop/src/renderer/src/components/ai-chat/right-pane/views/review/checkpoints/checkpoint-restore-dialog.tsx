/**
 * 检查点还原确认：写明不移动 HEAD，未跟踪删除必须列出路径。
 */
import type { EnjoyCheckpointItem } from "@enjoy-agents/ipc-contract"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"

const UNTRACKED_PREVIEW_LIMIT = 12

export function CheckpointRestoreDialog(props: {
  item: EnjoyCheckpointItem | null
  untracked: string[]
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const { item, untracked, onOpenChange, onConfirm } = props
  const t = useT()
  const extra = Math.max(0, untracked.length - UNTRACKED_PREVIEW_LIMIT)
  return (
    <ConfirmDialog
      open={item != null}
      destructive
      title={t("chat.reviewCheckpointRestoreTitle")}
      description={t("chat.reviewCheckpointRestoreDesc")}
      confirmLabel={t("chat.reviewCheckpointRestore")}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    >
      {untracked.length > 0 ? (
        <div className="rounded-xl border border-border-error-default/40 bg-background-tertiary-error/40 px-3 py-2">
          <p className="text-caption-1-medium text-text-error-primary">
            {t("chat.reviewCheckpointRestoreUntracked")}
          </p>
          <ul className="mt-1.5 max-h-36 space-y-0.5 overflow-y-auto font-mono text-caption-2-regular text-text-secondary">
            {untracked.slice(0, UNTRACKED_PREVIEW_LIMIT).map((path) => (
              <li key={path} className="truncate" title={path}>
                {path}
              </li>
            ))}
          </ul>
          {extra > 0 ? (
            <p className="mt-1 text-caption-2-regular text-text-tertiary">
              {t("chat.reviewCheckpointRestoreUntrackedMore", { n: String(extra) })}
            </p>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
  )
}
