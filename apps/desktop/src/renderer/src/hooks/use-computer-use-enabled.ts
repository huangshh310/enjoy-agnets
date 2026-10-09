/**
 * 渲染进程只读 Computer Use 开关，不碰权限细节。
 * Chat 用 hidden 保活，设置页改开关后必须广播，不能只在挂载时读一次。
 */
import { useEffect, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"

const COMPUTER_USE_ENABLED_EVENT = "enjoy:computer-use-changed"

export function publishComputerUseEnabled(enabled: boolean): void {
  window.dispatchEvent(new CustomEvent(COMPUTER_USE_ENABLED_EVENT, { detail: enabled }))
}

export function useComputerUseEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!hasIde()) return
    let cancelled = false
    void readEnabled().then((next) => {
      if (!cancelled) setEnabled(next)
    })
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      if (typeof detail === "boolean") setEnabled(detail)
    }
    window.addEventListener(COMPUTER_USE_ENABLED_EVENT, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(COMPUTER_USE_ENABLED_EVENT, onChange)
    }
  }, [])
  return enabled
}

async function readEnabled(): Promise<boolean> {
  try {
    const state = await getIde().builtinTools.getState()
    return state.computerUse.enabled
  } catch {
    return false
  }
}
