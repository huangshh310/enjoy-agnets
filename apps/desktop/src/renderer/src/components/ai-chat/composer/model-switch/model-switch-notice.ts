/**
 * I1 同引擎换模瞬时反馈：芯片旁角标 + 可选「已切换到 {model}」轻浮层。
 * 挂在芯片簇附近，不进 Composer 上方常驻条。
 */
const TOAST_MS = 2800
const BADGE_MS = 3000

let toastLabel: string | null = null
let toastTimer: ReturnType<typeof setTimeout> | 0 = 0
let badgeVisible = false
let badgeTimer: ReturnType<typeof setTimeout> | 0 = 0
let nextTurnVisible = false
const listeners = new Set<() => void>()

export function showModelSwitchNotice(modelLabel: string, opts?: { nextTurn?: boolean }) {
  const next = modelLabel.trim()
  if (!next) return
  toastLabel = next
  globalThis.clearTimeout(toastTimer)
  toastTimer = globalThis.setTimeout(() => {
    toastLabel = null
    toastTimer = 0
    emit()
  }, TOAST_MS)

  badgeVisible = true
  nextTurnVisible = Boolean(opts?.nextTurn)
  globalThis.clearTimeout(badgeTimer)
  badgeTimer = globalThis.setTimeout(() => {
    badgeVisible = false
    nextTurnVisible = false
    badgeTimer = 0
    emit()
  }, BADGE_MS)
  emit()
}

/** 下次发送后角标提前淡出（与约 3s 较早者）。 */
export function clearModelSwitchBadge() {
  if (!badgeVisible && !nextTurnVisible && !toastLabel) return
  badgeVisible = false
  nextTurnVisible = false
  toastLabel = null
  globalThis.clearTimeout(badgeTimer)
  badgeTimer = 0
  globalThis.clearTimeout(toastTimer)
  toastTimer = 0
  emit()
}

export function modelSwitchNoticeLabel(): string | null {
  return toastLabel
}

export function modelSwitchBadgeVisible(): boolean {
  return badgeVisible
}

export function modelSwitchNextTurnVisible(): boolean {
  return nextTurnVisible
}

export function subscribeModelSwitchNotice(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener()
}
