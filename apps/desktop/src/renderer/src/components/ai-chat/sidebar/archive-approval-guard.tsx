/**
 * 归档未决审批：确认后走 Dock 同一条 deny，再归档。
 */
import { useSyncExternalStore } from "react"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import {
  cancelArchivePrompt,
  confirmDenyAndArchive,
  peekArchivePrompt,
  subscribeArchivePrompt
} from "@renderer/hooks/deny-then-archive"
import { useT } from "@renderer/i18n"

export function ArchiveApprovalGuard() {
  const t = useT()
  const prompt = useSyncExternalStore(subscribeArchivePrompt, peekArchivePrompt, peekArchivePrompt)
  return (
    <ConfirmDialog
      open={prompt !== null}
      title={t("chat.archivePendingTitle")}
      description={t("chat.archivePendingDesc")}
      confirmLabel={t("chat.archivePendingConfirm")}
      cancelLabel={t("common.cancel")}
      destructive
      onOpenChange={(open) => {
        if (!open) cancelArchivePrompt()
      }}
      onConfirm={() => {
        void confirmDenyAndArchive().catch(() => undefined)
      }}
    />
  )
}
