/**
 * 发送回 provider_forbidden / provider_billing：白卡 + 琥珀点 + 换个模型 / 再试一次。
 * 草稿留下，不摊状态码或服务英文，不当密钥无效。
 */
import { RiCpuLine, RiRefreshLine } from "@remixicon/react"
import { retryKeptDraft, useRetryKeptDraftAvailable } from "@renderer/hooks/retry-kept-draft"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { defaultProviderLabel } from "@renderer/lib/default-provider-label"
import { isProviderBilling } from "@renderer/lib/send-gate-codes"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"
import { retryCardView } from "./retry-card-view"
import { useRestoredImagesDetail } from "./use-restored-images-detail"

export function ThreadCredentialRestrictedNotice({
  code,
  onDismiss,
  className
}: {
  code: string
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const restoredDetail = useRestoredImagesDetail()
  const running = useChatStore((state) => state.running)
  // leo r5 / jojo：同「再发一次」——不安全 / 没有还稿快照就隐藏「再试一次」，第二行改说下一步；「换个模型」和 × 照常。
  const view = retryCardView({
    canRetry: useRetryKeptDraftAvailable(),
    running,
    restoredDetail,
    editThenSend: t("chat.sendFailedEditThenSend")
  })
  const readiness = useChatReadiness().data
  const providers = useSettingsSnapshot().data?.providers ?? []
  const name = defaultProviderLabel(readiness, providers, t("chat.credentialProviderFallback"))
  const billing = isProviderBilling(code)
  return (
    <ThreadSendGateNotice
      testId="thread-credential-restricted-notice"
      kind={billing ? "provider_billing" : "provider_forbidden"}
      tone="warning"
      message={t(billing ? "chat.credentialBillingNotice" : "chat.credentialForbiddenNotice", { name })}
      detail={view.detail}
      actionLabel={t("chat.switchModel")}
      actionIcon={<RiCpuLine className="size-3" />}
      onAction={() => {
        onDismiss()
        useChatStore.getState().setAgentPickerOpen(true)
      }}
      secondaryActionLabel={view.showRetry ? (running ? t("chat.resendingDraft") : t("chat.retryDraft")) : undefined}
      secondaryActionIcon={<RiRefreshLine className="size-3" />}
      secondaryActionDisabled={running}
      // jojo P2（r4）：与「再发一次」同一规则——只重发被留下的那一句，输入框里的新草稿不动。
      onSecondaryAction={view.showRetry ? retryKeptDraft : undefined}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
