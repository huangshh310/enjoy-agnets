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

let lastSubmitted = ""

/** 这次 Enter 交出去（入队 / 发出）的原文：只有它才允许在「正在准备…」时从输入框擦掉。 */
export function noteComposerSubmitted(text: string): void {
  lastSubmitted = text.trim()
}

export function lastComposerSubmitted(): string {
  return lastSubmitted
}

/**
 * 首发「正在准备…」不得清空已键入；只有建会话窗且 store 已空才擦 shown。
 * jojo ②：中文冷启动整句丢——组字期间 store 不更新（为空），冷启动建会话一开 preparing 就把输入框
 * 正在组字 / 刚打完未发的整句擦掉。组字中一律不擦；输入框里是没交出去的字也不擦。
 */
export function shouldClearShownOnPreparing(input: {
  preparing: boolean
  wasPreparing: boolean
  value: string
  createPending: boolean
  composing?: boolean
  /** 输入框当下显示的字。 */
  shown?: string
  /** 最近一次 Enter 交出去的原文。 */
  submitted?: string
}): boolean {
  if (!input.createPending) return false
  if (input.composing) return false
  const shown = input.shown?.trim() ?? ""
  if (shown && shown !== (input.submitted ?? "").trim()) return false
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
