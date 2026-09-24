/**
 * 同引擎换模成功提示。挂在输入区上方，不跟底栏芯片走。
 */
const TOAST_MS = 3200

let label: string | null = null
let timer = 0
const listeners = new Set<() => void>()

export function showModelSwitchNotice(modelLabel: string) {
  const next = modelLabel.trim()
  if (!next) return
  label = next
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    label = null
    timer = 0
    emit()
  }, TOAST_MS)
  emit()
}

export function modelSwitchNoticeLabel(): string | null {
  return label
}

export function subscribeModelSwitchNotice(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener()
}
