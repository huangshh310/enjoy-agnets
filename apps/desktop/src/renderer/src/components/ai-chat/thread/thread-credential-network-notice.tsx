/**
 * 发送回 provider_unreachable：还差一步同款白卡片 + 中性点 + 再发一次。
 * 重复失败只换同一条，不叠层。
 */
import { RiRefreshLine } from "@remixicon/react"
import { retryKeptDraft, useRetryKeptDraftAvailable } from "@renderer/hooks/retry-kept-draft"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { useSendFailureProviderName } from "@renderer/hooks/use-send-failure-provider-name"
import { fillProviderFace } from "@renderer/lib/provider-face"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"
import { retryCardView } from "./retry-card-view"
import { useRestoredImagesDetail } from "./use-restored-images-detail"

export function ThreadCredentialNetworkNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const restoredDetail = useRestoredImagesDetail()
  const running = useChatStore((state) => state.running)
  // leo r5 / jojo：那一句不在原样 / 没有还稿快照 → 隐藏「再发一次」，第二行改说下一步（重发进行中照常显示禁用态）。
  const view = retryCardView({
    canRetry: useRetryKeptDraftAvailable(),
    running,
    restoredDetail,
    editThenSend: t("chat.sendFailedEditThenSend")
  })
  // 跟前台引擎走：Amp / 自定义助手失败说引擎名，不说聊天密钥档案名（luna m136b-62）。
  const face = useSendFailureProviderName()
  return (
    <ThreadSendGateNotice
      testId="thread-credential-network-notice"
      kind="provider_unreachable"
      tone="neutral"
      message={fillProviderFace(t, "chat.credentialNetworkNotice", face)}
      detail={view.detail}
      actionLabel={view.showRetry ? (running ? t("chat.resendingDraft") : t("chat.resendDraft")) : undefined}
      actionIcon={<RiRefreshLine className="size-3" />}
      actionDisabled={running}
      onAction={view.showRetry ? retryKeptDraft : undefined}
      onDismiss={onDismiss}
      className={className}
    />
  )
}

/** 红卡重试：实现与行为测试在 hooks/retry-kept-draft（#135 leo）。 */
export { retryKeptDraft }
