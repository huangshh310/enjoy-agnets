/**
 * 空状态点胶囊后，把光标放到 Composer 末尾。
 */
export function focusComposerEnd(text?: string) {
  requestAnimationFrame(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>("form textarea")
    if (!textarea) return
    textarea.focus()
    const pos = text?.length ?? textarea.value.length
    textarea.setSelectionRange(pos, pos)
  })
}
