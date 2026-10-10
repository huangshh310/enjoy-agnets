/**
 * 发送回 provider_unreachable：还差一步同款白卡片 + 中性点 + 再发一次。
 * 重复失败只换同一条，不叠层。
 */
import { RiRefreshLine } from "@remixicon/react"
import { sendComposerMessage } from "@renderer/hooks/use-agent-session"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { defaultProviderLabel } from "@renderer/lib/default-provider-label"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"

export function ThreadCredentialNetworkNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const running = useChatStore((state) => state.running)
  const readiness = useChatReadiness().data
  const providers = useSettingsSnapshot().data?.providers ?? []
  const name = defaultProviderLabel(readiness, providers, t("chat.credentialProviderFallback"))
  return (
    <ThreadSendGateNotice
      testId="thread-credential-network-notice"
      kind="provider_unreachable"
      tone="neutral"
      message={t("chat.credentialNetworkNotice", { name })}
      actionLabel={running ? t("chat.resendingDraft") : t("chat.resendDraft")}
      actionIcon={<RiRefreshLine className="size-3" />}
      actionDisabled={running}
      onAction={() => {
        void sendComposerMessage()
      }}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
