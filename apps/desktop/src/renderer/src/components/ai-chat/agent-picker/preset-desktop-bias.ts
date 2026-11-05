/**
 * 启动预设的桌面叙事开关（Composer 侧小标）。
 * 开 ≠ 已批准 / ≠ Always-allow / ≠ RunAgentInput.desktopBias。
 */
import { useSyncExternalStore } from "react"

let desktopBias = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getPresetDesktopBias(): boolean {
  return desktopBias
}

export function setPresetDesktopBias(value: boolean): void {
  if (desktopBias === value) return
  desktopBias = value
  emit()
}

export function subscribePresetDesktopBias(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePresetDesktopBias(): boolean {
  return useSyncExternalStore(subscribePresetDesktopBias, getPresetDesktopBias, getPresetDesktopBias)
}
