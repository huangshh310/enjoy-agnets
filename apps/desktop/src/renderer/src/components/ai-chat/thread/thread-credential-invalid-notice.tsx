/**
 * 发送被 credential_invalid 挡住：白卡片 + 红点 + 改密钥，打开本档案密钥框；解析不出档案时打开添加密钥。
 */
import { RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { defaultProviderLabel, resolveDefaultProviderId } from "@renderer/lib/default-provider-label"
import { goFixKey } from "./credential-fix-key-nav"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"
import { useRestoredImagesDetail } from "./use-restored-images-detail"

export function ThreadCredentialInvalidNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const restoredDetail = useRestoredImagesDetail()
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
      detail={restoredDetail}
      actionLabel={t("chat.goFixKey")}
      actionIcon={<RiKey2Line className="size-3" />}
      onAction={() => goFixKey(navigate as never, providerId)}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
