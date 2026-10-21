/**
 * 发送被 credential_invalid 挡住：白卡片 + 红点 + 改密钥，打开**这一轮实际用的**档案的密钥框（luna P2-1）；
 * ACP 引擎没绑档案 → 打开它自己的设置卡；解析不出档案时打开添加密钥；免密钥档案不给改密钥。
 * luna P2（m211）：密钥没改好又按了发送（被闸拦下 / main 拒掉）→ 第二行补「先改好密钥再发。」，不静默。
 */
import { useSyncExternalStore } from "react"
import { RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { useSendFailureTarget } from "@renderer/hooks/use-send-failure-provider-name"
import { fillProviderFace } from "@renderer/lib/provider-face"
import { fixKeyTargetNavigation } from "./credential-fix-key-nav"
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
  // 跟这一轮实际走的引擎 / 档案：Amp / 自定义助手失败说引擎名，不说聊天密钥档案名（luna m136b-62、P2-1）。
  const { face, fixKey } = useSendFailureTarget()
  return (
    <ThreadSendGateNotice
      testId="thread-credential-invalid-notice"
      kind="credential_invalid"
      tone="danger"
      message={fillProviderFace(t, "chat.credentialInvalidNotice", face)}
      detail={credentialInvalidDetail(nudge, restoredDetail)}
      actionLabel={fixKey ? t("chat.goFixKey") : undefined}
      actionIcon={<RiKey2Line className="size-3" />}
      onAction={fixKey ? () => void navigate(fixKeyTargetNavigation(fixKey) as never) : undefined}
      onDismiss={() => {
        // 卡关掉就不再提醒；下次再被拦下会重新记。
        clearCredentialSendBlocked(sessionId)
        onDismiss()
      }}
      className={className}
    />
  )
}
