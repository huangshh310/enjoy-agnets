/**
 * 只读 Composer 输入框 DOM。供发送与建会话共用，避免 lifecycle ↔ draft 环依赖。
 */
import { useChatStore } from "../stores/chat-store"

export function composerInputEl(): HTMLTextAreaElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null
}

/** 发送清稿后立刻对齐 DOM，避免受控框还没重绘时 flush 把旧字写回 store。 */
export function syncComposerDom(value: string): void {
  const el = composerInputEl()
  if (el && el.value !== value) el.value = value
}

export function flushComposerDomToStore(): string {
  const store = useChatStore.getState()
  const el = composerInputEl()
  const fromDom = el?.value ?? store.composer
  if (fromDom !== store.composer) store.setComposer(fromDom)
  return fromDom
}
