/**
 * 任意窗口第一次 did-finish-load 才 restore，避免 send 丢给未加载的 renderer。
 * 进程级 started 只跑一次；绑定已经加载完的那个窗口（含 activate 新建的）。
 * 首窗 did-fail-load 或关掉不置位 started，好让下一扇窗再试。
 */
export type LoadFinishContents = {
  once: (event: "did-finish-load", listener: () => void) => void
}

export function createOrphanRestoreScheduler() {
  let started = false
  return {
    schedule<T>(window: T, restore: (window: T) => void): void {
      if (started) return
      contentsOf(window).once("did-finish-load", () => {
        if (started) return
        started = true
        restore(window)
      })
    }
  }
}

const processScheduler = createOrphanRestoreScheduler()

export function scheduleOrphanRestoreAfterLoad<T>(
  window: T,
  restore: (window: T) => void
): void {
  processScheduler.schedule(window, restore)
}

/** Electron once 重载不能直接赋给窄事件签名，取值时再收窄。 */
function contentsOf(window: unknown): LoadFinishContents {
  return (window as { webContents: LoadFinishContents }).webContents
}
