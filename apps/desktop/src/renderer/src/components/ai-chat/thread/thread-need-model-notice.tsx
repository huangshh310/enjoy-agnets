/**
 * 当前档案有密钥但没选模型：中性条 + 去选择，打开 Composer 模型 Picker。
 */
import { RiCpuLine } from "@remixicon/react"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ThreadSendGateNotice } from "./thread-send-gate-notice"

export function ThreadNeedModelNotice({
  onDismiss,
  className
}: {
  onDismiss: () => void
  className?: string
}) {
  const t = useT()
  return (
    <ThreadSendGateNotice
      testId="thread-need-model-notice"
      kind="needs_model"
      message={t("chat.needModelNotice")}
      actionLabel={t("chat.goPickModel")}
      actionIcon={<RiCpuLine className="size-3" />}
      onAction={() => {
        onDismiss()
        useChatStore.getState().setAgentPickerOpen(true)
      }}
      onDismiss={onDismiss}
      className={className}
    />
  )
}
