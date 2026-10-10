/**
 * 只读 Composer 输入框 DOM。供发送与建会话共用，避免 lifecycle ↔ draft 环依赖。
 */
import { useChatStore } from "../stores/chat-store"

export function flushComposerDomToStore(): string {
  const store = useChatStore.getState()
  if (typeof document === "undefined") return store.composer
  const el = document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null
  const fromDom = el?.value ?? store.composer
  if (fromDom !== store.composer) store.setComposer(fromDom)
  return fromDom
}
