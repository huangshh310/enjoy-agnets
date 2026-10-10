/**
 * 只读 Composer 输入框 DOM。供发送与建会话共用，避免 lifecycle ↔ draft 环依赖。
 */
import { useChatStore } from "../stores/chat-store"
import { isComposerComposing } from "./composer-ime"
import { isComposerWritebackHeld } from "./composer-sync-lock"
import { isNewSessionCreatePending } from "./new-session-create"

export function composerInputEl(): HTMLTextAreaElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null
}

export function shouldHoldComposerStoreSync(): boolean {
  return isComposerComposing() || isComposerWritebackHeld() || isNewSessionCreatePending()
}

/** Enter / 入队只认输入框当下全文，禁止回落半成品 store。 */
export function readComposerDomText(): string {
  const el = composerInputEl()
  if (el) return el.value
  return useChatStore.getState().composer
}

/** 发送清稿后立刻对齐 DOM。组字中、建会话、入队期间禁止写回。force 只给提交成功清稿。 */
export function syncComposerDom(value: string, force = false): void {
  if (!force && shouldHoldComposerStoreSync()) return
  const el = composerInputEl()
  if (el && el.value !== value) el.value = value
}

export function flushComposerDomToStore(): string {
  const store = useChatStore.getState()
  if (isComposerComposing()) return store.composer
  const fromDom = readComposerDomText()
  if (fromDom !== store.composer) store.setComposer(fromDom)
  return fromDom
}
