/**
 * leo r3 M1：store 补丁要还稿时，先读输入框当下全文（DOM 可能比 store 新）再合并，合并后写回 DOM。
 * 无依赖叶子：真正的读写由 queue-composer-send 注册（避免 chat-store ↔ composer-dom 循环依赖）；
 * 没注册（单测）时只用 store 的 composer。
 */
export type ComposerIo = {
  read: () => string
  write: (text: string) => void
}

let io: ComposerIo | null = null

export function setComposerIo(next: ComposerIo | null): void {
  io = next
}

export function readComposerForMerge(fallback: string): string {
  try {
    return io ? io.read() : fallback
  } catch {
    return fallback
  }
}

export function writeComposerAfterMerge(text: string): void {
  try {
    io?.write(text)
  } catch {
    // DOM 写回失败不影响 store
  }
}
