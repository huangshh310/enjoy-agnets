/**
 * 没有任何可对话路线：中性条 + 去连接。
 */
import { RiKey2Line } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"

export function ThreadNoChatRouteNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <ThreadSendGateNotice
      testId="thread-no-chat-route-notice"
      message={t("chat.noChatRouteNotice")}
      actionLabel={t("chat.goConnect")}
      actionIcon={<RiKey2Line className="size-3" />}
      onAction={() => {
        onDismiss()
        void navigate({ to: "/settings/$section", params: { section: "providers" } })
      }}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
