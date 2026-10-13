/**
 * leo #145 soft：Composer 发送占位的 running 归属。迟到作废的那一发只能放掉**自己**占的 running，
 * 不能把后一发（看门狗还稿后用户又发的）正在占的 running 清掉。
 */
import { useChatStore } from "../../stores/chat-store"

let owner: object | null = null

/** 本次发送占位 running，并记下归属。 */
export function claimComposerRunning(token: object): void {
  owner = token
  useChatStore.getState().setRunning(true)
}

/** 只有 running 仍归这次发送时才放掉；别人已接手则不动。返回是否放掉。 */
export function releaseComposerRunningIfOwner(token: object): boolean {
  if (owner !== token) return false
  owner = null
  useChatStore.getState().setRunning(false)
  return true
}

/** running 被别的发送 / 别的轮占着（不是这次）。 */
export function runningHeldByOther(token: object): boolean {
  return useChatStore.getState().running && owner !== token
}

export function resetComposerRunningOwnerForTest(): void {
  owner = null
}
