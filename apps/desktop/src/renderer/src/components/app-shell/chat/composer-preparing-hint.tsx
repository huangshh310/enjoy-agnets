/**
 * 正在建会话或首句排队时的轻提示。贴 Composer 上沿，不走 toast。
 * jojo P2b：只画在正在准备的那个会话上。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { preparingHintVisible } from "@renderer/hooks/preparing-hint-visible"
import { railAlreadySaysPreparing } from "./preparing-hint-dedupe"

export function ComposerPreparingHint() {
  const t = useT()
  const preparingHint = useChatStore((state) => state.preparingHint)
  const preparingSessionId = useChatStore((state) => state.preparingSessionId)
  const sessionId = useChatStore((state) => state.sessionId)
  const error = useChatStore((state) => state.error)
  // 灰条「上一条还在准备」已经在说同一件事：只留灰条，不叠两层（luna 3cf0）。
  if (railAlreadySaysPreparing(error)) return null
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
