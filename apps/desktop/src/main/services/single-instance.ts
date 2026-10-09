/**
 * 主进程单实例锁。第二份进程直接退出，避免双开抢同一计划点。
 */
export type SingleInstanceApp = {
  requestSingleInstanceLock: () => boolean
  on: (event: "second-instance", listener: () => void) => void
}

export type FocusableWindow = {
  isDestroyed: () => boolean
  isMinimized: () => boolean
  restore: () => void
  show: () => void
  focus: () => void
}

/** 拿到锁才继续；失败由调用方 markQuitAllowed + quit，不要启动调度。 */
export function acquireSingleInstanceLock(
  app: SingleInstanceApp,
  onSecondInstance: () => void
): boolean {
  if (!app.requestSingleInstanceLock()) return false
  app.on("second-instance", onSecondInstance)
  return true
}

/** Win / Linux 二次启动走 second-instance；macOS Dock 重开走 activate，不走这里。 */
export function focusOrRestoreWindow(
  listWindows: () => FocusableWindow[],
  createIfMissing?: () => void
): void {
  const win = listWindows().find((item) => !item.isDestroyed())
  if (!win) {
    createIfMissing?.()
    return
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}
