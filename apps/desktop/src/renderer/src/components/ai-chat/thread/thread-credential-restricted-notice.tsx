/**
 * 发送回 provider_forbidden / provider_billing：白卡 + 琥珀点 + 换个模型 / 再试一次。
 * 官方额度不足再补「去充值」（与第 4 步 / 设置行同一 officialTopUpUrl 口径）；代理 / 仿冒不给。
 * 草稿留下，不摊状态码或服务英文，不当密钥无效。
 */
import { RiCpuLine, RiRefreshLine, RiWallet3Line } from "@remixicon/react"
import { retryKeptDraft, useRetryKeptDraftAvailable } from "@renderer/hooks/retry-kept-draft"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { useSendFailureTarget } from "@renderer/hooks/use-send-failure-provider-name"
import { fillProviderFace } from "@renderer/lib/provider-face"
import { isProviderBilling } from "@renderer/lib/send-gate-codes"
import { requestOpenExternalQuiet } from "@renderer/components/ai-chat/right-pane/views/terminal/attach-xterm-addons"
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
  const midTurn = useChatStore((state) => state.errorStage === "mid_turn")
  // leo r5 / jojo：同「再发一次」——不安全 / 没有还稿快照就隐藏「再试一次」，第二行改说下一步；「换个模型」和 × 照常。
  const view = retryCardView({
    canRetry: useRetryKeptDraftAvailable(),
    running,
    restoredDetail,
    editThenSend: t("chat.sendFailedEditThenSend"),
    midTurn,
    midTurnDetail: t("chat.midTurnFailedDetail")
  })
  // 跟前台引擎走：Amp / 自定义助手失败说引擎名，不说聊天密钥档案名（luna m136b-62）。
  const { face, topUpUrl } = useSendFailureTarget()
  const billing = isProviderBilling(code)
  const showTopUp = billing && Boolean(topUpUrl)
  const noticeKey = midTurn
    ? billing
      ? "chat.credentialBillingMidTurnNotice"
      : "chat.credentialForbiddenMidTurnNotice"
    : billing
      ? "chat.credentialBillingNotice"
      : "chat.credentialForbiddenNotice"
  return (
    <ThreadSendGateNotice
      testId="thread-credential-restricted-notice"
      kind={billing ? "provider_billing" : "provider_forbidden"}
      tone="warning"
      message={fillProviderFace(t, noticeKey, face)}
      detail={view.detail}
      topUpLabel={showTopUp ? t("settings.providers.topUp") : undefined}
      topUpIcon={showTopUp ? <RiWallet3Line className="size-3" /> : undefined}
      onTopUp={
        showTopUp && topUpUrl
          ? () => {
              requestOpenExternalQuiet(topUpUrl)
            }
          : undefined
      }
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
