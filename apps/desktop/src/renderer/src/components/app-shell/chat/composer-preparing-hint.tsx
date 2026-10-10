/**
 * 正在建会话或首句排队时的轻提示。贴 Composer 上沿，不走 toast。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function ComposerPreparingHint() {
  const t = useT()
  const preparing = useChatStore((state) => state.preparingHint)
  if (!preparing) return null
  return (
    <p
      data-testid="composer-preparing-hint"
      className="px-1 pb-1.5 text-caption-2-regular text-text-secondary"
    >
      {t("chat.preparingHint")}
    </p>
  )
}
