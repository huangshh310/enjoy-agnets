/**
 * 焦点在输入或编辑器里时，不抢走后退/前进快捷键。
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return Boolean(target.closest("[contenteditable='true'], .monaco-editor, .cm-editor, [role='textbox']"))
}
