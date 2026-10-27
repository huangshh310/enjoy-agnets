/**
 * 长线程切进来时只挂末尾几轮。更早的回合等靠近视口，或被查找 / 刻度点到，再挂 Markdown。
 */
export const EAGER_THREAD_TAIL = 8

export function shouldMountThreadTurn(input: {
  index: number
  count: number
  revealed: boolean
  near: boolean
  streaming: boolean
}): boolean {
  if (input.streaming || input.revealed || input.near) return true
  if (input.count <= EAGER_THREAD_TAIL) return true
  return input.index >= input.count - EAGER_THREAD_TAIL
}
