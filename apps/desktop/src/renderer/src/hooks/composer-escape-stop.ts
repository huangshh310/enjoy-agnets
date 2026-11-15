/**
 * E1 M3：输入框里按 Esc 停这一轮（草稿不动）。只在输入框内生效（host ⑩）。
 * 调用方必须先让 IME 组字、@ / 面板、历史召回吃键；这些层开着时 Esc 只关层，不停车。
 * 预览层、对话框焦点不在 textarea，天然拿不到这次按键。
 */
export function shouldEscapeStopRun(input: {
  key: string
  running: boolean
  composing: boolean
  defaultPrevented: boolean
  modified: boolean
}): boolean {
  if (input.key !== "Escape") return false
  if (!input.running || input.composing || input.defaultPrevented || input.modified) return false
  return true
}

/**
 * 运行中占位句尾补「Esc 停止」（luna §1.4；jojo ⑦：排队暂停句也补，但只在有一轮在跑时）。
 * 没在跑时不补：按 Esc 没东西可停。原句（user-copy-invariants 锁着）不改，只在尾部替换省略号接后缀。
 */
export function withEscStopHint(text: string, running: boolean, suffix: string): string {
  if (!running || !suffix) return text
  return `${text.replace(/[…。.\s]+$/u, "")}${suffix}`
}
