/**
 * 主进程单实例锁。第二份进程直接退出，避免双开抢同一计划点。
 */
export type SingleInstanceApp = {
  requestSingleInstanceLock: () => boolean
  on: (event: "second-instance", listener: () => void) => void
  exit?: (code?: number) => void
  isReady?: () => boolean
}

export type FocusableWindow = {
  isDestroyed: () => boolean
  isMinimized: () => boolean
  restore: () => void
  show: () => void
  focus: () => void
}

let primary = false

export function isPrimaryInstance(): boolean {
  return primary
}

/** 拿到锁才继续；失败由调用方 markQuitAllowed + exit，不要启动调度。 */
export function acquireSingleInstanceLock(
  app: SingleInstanceApp,
  onSecondInstance: () => void
): boolean {
  if (!app.requestSingleInstanceLock()) {
    primary = false
    return false
  }
  primary = true
  app.on("second-instance", onSecondInstance)
  return true
}

export function exitSecondaryInstance(app: { exit: (code?: number) => void }): void {
  app.exit(0)
}

/** 非主实例的 will-quit / window-all-closed 必须跳过，不得 stamp 共享库。 */
export function runIfPrimaryInstance(fn: () => void): void {
  if (!primary) return
  fn()
}

export function startPrimaryOrExit(
  app: SingleInstanceApp & { exit: (code?: number) => void },
  onSecondInstance: () => void,
  startPrimary: () => void,
  beforeExit?: () => void
): boolean {
  if (!acquireSingleInstanceLock(app, onSecondInstance)) {
    beforeExit?.()
    exitSecondaryInstance(app)
    return false
  }
  startPrimary()
  return true
}

/** Win / Linux 二次启动走 second-instance；macOS Dock 重开走 activate，不走这里。 */
export function focusOrRestoreWindow(
  listWindows: () => FocusableWindow[],
  createIfMissing?: () => void,
  isReady?: () => boolean
): void {
  const win = listWindows().find((item) => !item.isDestroyed())
  if (!win) {
    if (isReady && !isReady()) return
    createIfMissing?.()
    return
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}
