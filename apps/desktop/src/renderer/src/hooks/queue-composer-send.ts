/**
 * 新对话还没建好时的发送：入队、失败还文。禁止先清输入再空等。
 */
import { useChatStore } from "../stores/chat-store"
import {
  isNewSessionCreatePending,
  shouldQueueComposerSend,
  waitForNewSessionCreate
} from "./new-session-create"
import { SEND_FAILED_RESTORE, SESSION_CREATE_TIMEOUT, SESSION_NOT_READY } from "./queue-composer-send-copy"

export { SEND_FAILED_RESTORE, SESSION_CREATE_TIMEOUT, SESSION_NOT_READY } from "./queue-composer-send-copy"

export function composerNeedsSessionReady(): boolean {
  const store = useChatStore.getState()
  return shouldQueueComposerSend(store.sessionId, isNewSessionCreatePending())
}

export function restoreComposerAfterFailedSend(text: string, reason: string): void {
  const store = useChatStore.getState()
  store.setRunning(false)
  store.setComposer(text)
  store.setError(reason)
}

export function sendFailureCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message === "SESSION_CREATE_TIMEOUT") return SESSION_CREATE_TIMEOUT
  if (message === "NO_PENDING_SESSION_CREATE") return SESSION_NOT_READY
  return SEND_FAILED_RESTORE
}

export async function waitThenSendAfterCreate(
  text: string,
  sendReady: (prepared: { content: string }) => Promise<void>
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  try {
    await waitForNewSessionCreate()
    await sendReady({ content: trimmed })
  } catch (error) {
    restoreComposerAfterFailedSend(trimmed, sendFailureCopy(error))
  }
}
