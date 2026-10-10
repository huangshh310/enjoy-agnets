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
