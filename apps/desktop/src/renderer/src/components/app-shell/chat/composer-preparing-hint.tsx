/**
 * 正在建会话或首句排队时的轻提示。贴 Composer 上沿，不走 toast。
 * jojo P2b：只画在正在准备的那个会话上。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { preparingHintVisible } from "@renderer/hooks/preparing-hint-visible"

export function ComposerPreparingHint() {
  const t = useT()
  const preparingHint = useChatStore((state) => state.preparingHint)
  const preparingSessionId = useChatStore((state) => state.preparingSessionId)
  const sessionId = useChatStore((state) => state.sessionId)
  if (!preparingHintVisible({ preparingHint, preparingSessionId, sessionId })) return null
  return (
    <p
      data-testid="composer-preparing-hint"
      className="px-1 pb-1.5 text-caption-2-regular text-text-secondary"
    >
      {t("chat.preparingHint")}
    </p>
  )
}
