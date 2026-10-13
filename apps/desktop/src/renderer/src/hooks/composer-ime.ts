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

/**
 * leo #145 soft：preparing 翻起时正在组字 → 当时没擦；组字结束（compositionend）再查一次，
 * 别让已交出去的旧句留在输入框。返回擦后的新稿；不该动返回 null。
 * 输入框 = 旧句 → ""；旧句 + 新组的字 → 只留新组的字；其余（没交出去的字）不动。
 */
export function shownAfterCompositionOnPreparing(input: {
  preparing: boolean
  createPending: boolean
  composing: boolean
  shown: string
  submitted: string
}): string | null {
  if (!input.preparing || !input.createPending || input.composing) return null
  const submitted = input.submitted.trim()
  if (!submitted) return null
  const shown = input.shown
  if (shown.trim() === submitted) return ""
  const lead = shown.trimStart()
  if (lead.startsWith(submitted)) return lead.slice(submitted.length).trimStart()
  return null
}

/** 首发入队清稿：输入框里正是刚交出去的那句（且不在组字）才清，别人后来打的字不动。 */
export function shouldClearShownOnQueuedSend(shown: string, submitted: string): boolean {
  if (composing) return false
  const s = shown.trim()
  return Boolean(s) && s === submitted.trim()
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
