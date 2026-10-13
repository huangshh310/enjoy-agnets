/**
 * 只读 Composer 输入框 DOM。供发送与建会话共用，避免 lifecycle ↔ draft 环依赖。
 */
import { useChatStore } from "../stores/chat-store"
import { isComposerComposing } from "./composer-ime"
import { isComposerWritebackHeld } from "./composer-sync-lock"
import { isNewSessionCreatePending } from "./new-session-create"

export function composerInputEl(): HTMLTextAreaElement | null {
  if (typeof document === "undefined") return null
  // 聚焦的那只优先：过渡期页面上可能短暂有两只输入框，querySelector 只拿第一只。
  const active = document.activeElement as HTMLElement | null
  if (active?.getAttribute?.("data-testid") === "composer-input") return active as HTMLTextAreaElement
  return document.querySelector('[data-testid="composer-input"]') as HTMLTextAreaElement | null
}

let enterText: string | null = null

/**
 * Enter keydown 那一刻输入框 DOM 的全文（event.currentTarget.value）。
 * X / Chromium 按序投递按键，Enter 到时 DOM 已是整句；React shown / store 可能还落后几个字。
 * 这次发送的正文与清稿用的 typed 只认它，并先把 store 对齐。
 */
export function captureComposerEnter(text: string): void {
  enterText = text
  const store = useChatStore.getState()
  if (store.composer !== text) store.setComposer(text)
}

/** 取走 Enter 快照（一次性）。没有就回落读 DOM（点发送按钮等）。 */
export function takeComposerEnter(): string | null {
  const text = enterText
  enterText = null
  return text
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
