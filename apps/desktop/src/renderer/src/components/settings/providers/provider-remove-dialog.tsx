/**
 * 删供应商确认框：始终先问；钥匙串拒绝时提示留在框内，删除钮仍可点。
 */
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import type { DeleteKeychainNoticeHint } from "@renderer/lib/delete-keychain-notice"
import { DeleteKeychainNotice } from "./delete-keychain-notice"

export type ProviderRemovePending = {
  id: string
  name: string
  agents: string
  refused?: DeleteKeychainNoticeHint
}

export function ProviderRemoveDialog({
  pending,
  onClose,
  onConfirm
}: {
  pending: ProviderRemovePending | null
  onClose: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={t("settings.providers.removeBoundTitle", { name: pending?.name ?? "" })}
      description={
        pending?.agents ? t("settings.providers.removeBoundDesc", { agents: pending.agents }) : ""
      }
      confirmLabel={t("common.delete")}
      destructive
      closeOnConfirm={false}
      testId="provider-remove-dialog"
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onConfirm={onConfirm}
    >
      {pending?.refused ? <DeleteKeychainNotice {...pending.refused} /> : null}
    </ConfirmDialog>
  )
}
