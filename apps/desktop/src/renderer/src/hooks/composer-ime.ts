/**
 * Composer IME：组字中不发、不 flush、不把 store 写回 DOM。
 */

let composing = false

export function isComposerComposing(): boolean {
  return composing
}

export function setComposerComposing(next: boolean): void {
  composing = next
}

/** 首发「正在准备…」不得清空已键入；只有建会话窗且 store 已空才擦 shown。 */
export function shouldClearShownOnPreparing(input: {
  preparing: boolean
  wasPreparing: boolean
  value: string
  createPending: boolean
}): boolean {
  if (!input.createPending) return false
  return input.preparing && !input.wasPreparing && !input.value
}

export function shouldIgnoreComposerEnter(event: {
  key: string
  keyCode?: number
  nativeEvent?: { isComposing?: boolean; keyCode?: number }
  isComposing?: boolean
}): boolean {
  if (event.key !== "Enter") return false
  return (
    composing ||
    event.isComposing === true ||
    event.nativeEvent?.isComposing === true ||
    event.keyCode === 229 ||
    event.nativeEvent?.keyCode === 229
  )
}
