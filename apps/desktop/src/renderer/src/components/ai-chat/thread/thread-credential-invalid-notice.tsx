/**
 * 发送被 credential_invalid 挡住：白卡片 + 红点 + 改密钥，打开本档案密钥框；解析不出档案时打开添加密钥。
 * luna P2（m211）：密钥没改好又按了发送（被闸拦下）→ 第二行补「先改好密钥再发。」，不静默。
 */
import { useSyncExternalStore } from "react"
import { RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { useSendFailureProviderName } from "@renderer/hooks/use-send-failure-provider-name"
import { fillProviderFace } from "@renderer/lib/provider-face"
import { resolveDefaultProviderId } from "@renderer/lib/default-provider-label"
import { goFixKey } from "./credential-fix-key-nav"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"
import { useRestoredImagesDetail } from "./use-restored-images-detail"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  clearCredentialSendBlocked,
  credentialInvalidDetail,
  credentialNudgeKey,
  getCredentialSendBlocked,
  subscribeCredentialSendBlocked
} from "@renderer/hooks/credential-send-nudge"

export function ThreadCredentialInvalidNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const restoredDetail = useRestoredImagesDetail()
  const sessionId = useChatStore((state) => state.sessionId)
  const blockedAll = useSyncExternalStore(subscribeCredentialSendBlocked, getCredentialSendBlocked)
  // 落地页（没有会话）也认：从落地页发被拦下时提醒记在空名下（luna P2）。
  const nudge = blockedAll.has(credentialNudgeKey(sessionId)) ? t("chat.credentialFixKeyFirst") : null
  const navigate = useNavigate()
  const readiness = useChatReadiness().data
  const providers = useSettingsSnapshot().data?.providers ?? []
  // 跟前台引擎走：Amp / 自定义助手失败说引擎名，不说聊天密钥档案名（luna m136b-62）。
  const face = useSendFailureProviderName()
  const providerId = resolveDefaultProviderId(readiness, providers)
  return (
    <ThreadSendGateNotice
      testId="thread-credential-invalid-notice"
      kind="credential_invalid"
      tone="danger"
      message={fillProviderFace(t, "chat.credentialInvalidNotice", face)}
      detail={credentialInvalidDetail(nudge, restoredDetail)}
      actionLabel={t("chat.goFixKey")}
      actionIcon={<RiKey2Line className="size-3" />}
      onAction={() => goFixKey(navigate as never, providerId)}
      onDismiss={() => {
        // 卡关掉就不再提醒；下次再被拦下会重新记。
        clearCredentialSendBlocked(sessionId)
        onDismiss()
      }}
      className={className}
    />
  )
}
