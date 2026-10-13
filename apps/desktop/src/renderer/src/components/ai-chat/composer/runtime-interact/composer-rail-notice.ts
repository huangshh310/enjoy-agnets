/**
 * 「上一条还在准备」灰条的收起逻辑（纯 store，便于单测）。
 */
import { composerInputEl } from "../../../../hooks/composer-dom"
import { PREVIOUS_STILL_PREPARING } from "../../../../lib/usage/classify-thread-error"
import { useChatStore } from "../../../../stores/chat-store"

/** 这条提示由 Composer 上沿灰条画，红卡（ThreadErrorBanner）不再画它。 */
export function isComposerRailNotice(error: string | null | undefined): boolean {
  return error === PREVIOUS_STILL_PREPARING
}

/** ✕：收掉灰条（只收这条，别的错误不动），焦点回输入框。 */
export function dismissComposerRailNotice(): void {
  const store = useChatStore.getState()
  if (isComposerRailNotice(store.error)) store.setError(null)
  composerInputEl()?.focus()
}

/** 会话准备好（准备提示由亮转灭）且当前是这条灰条：自动收掉。 */
export function autoDismissComposerRailNotice(wasPreparing: boolean, preparing: boolean): boolean {
  if (!wasPreparing || preparing) return false
  const store = useChatStore.getState()
  if (!isComposerRailNotice(store.error)) return false
  store.setError(null)
  return true
}

