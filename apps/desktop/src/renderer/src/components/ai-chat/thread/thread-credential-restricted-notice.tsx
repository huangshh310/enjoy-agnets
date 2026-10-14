/**
 * 发送回 provider_forbidden / provider_billing：白卡 + 琥珀点 + 换个模型 / 再试一次。
 * 草稿留下，不摊状态码或服务英文，不当密钥无效。
 */
import { RiCpuLine, RiRefreshLine } from "@remixicon/react"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { defaultProviderLabel } from "@renderer/lib/default-provider-label"
import { isProviderBilling } from "@renderer/lib/send-gate-codes"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"

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
  const running = useChatStore((state) => state.running)
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
      actionLabel={t("chat.switchModel")}
      actionIcon={<RiCpuLine className="size-3" />}
      onAction={() => {
        onDismiss()
        useChatStore.getState().setAgentPickerOpen(true)
      }}
      secondaryActionLabel={running ? t("chat.resendingDraft") : t("chat.retryDraft")}
      secondaryActionIcon={<RiRefreshLine className="size-3" />}
      secondaryActionDisabled={running}
      onSecondaryAction={() => {
        void sendComposerMessage()
      }}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
