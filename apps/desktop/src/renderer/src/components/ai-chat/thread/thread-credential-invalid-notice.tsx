/**
 * 发送被 credential_invalid 挡住：白卡片 + 红点 + 改密钥，打开本档案密钥框。
 */
import { RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { defaultProviderLabel, resolveDefaultProviderId } from "@renderer/lib/default-provider-label"
import { providerEditSearch } from "@renderer/lib/open-provider-edit"
import { CHAT_CONNECT_FROM } from "@renderer/lib/provider-form-origin"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"

export function ThreadCredentialInvalidNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const readiness = useChatReadiness().data
  const providers = useSettingsSnapshot().data?.providers ?? []
  const name = defaultProviderLabel(readiness, providers, t("chat.credentialProviderFallback"))
  const providerId = resolveDefaultProviderId(readiness, providers)
  return (
    <ThreadSendGateNotice
      testId="thread-credential-invalid-notice"
      kind="credential_invalid"
      tone="danger"
      message={t("chat.credentialInvalidNotice", { name })}
      actionLabel={t("chat.goFixKey")}
      actionIcon={<RiKey2Line className="size-3" />}
      onAction={() => {
        onDismiss()
        if (!providerId) return
        void navigate({
          to: "/settings/$section",
          params: { section: "providers" },
          search: providerEditSearch(providerId, CHAT_CONNECT_FROM)
        })
      }}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
