/**
 * 建会话 / 入队期间禁止 store→DOM 回写，避免「he」冲掉正在打的全文。
 */

let writebackHeld = false

export function setComposerWritebackHeld(held: boolean): void {
  writebackHeld = held
}

export function isComposerWritebackHeld(): boolean {
  return writebackHeld
}
