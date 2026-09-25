/**
 * 渲染进程只读 Computer Use 开关，不碰权限细节。
 */
import { useEffect, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useComputerUseEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!hasIde()) return
    void getIde()
      .builtinTools.getState()
      .then((state) => setEnabled(state.computerUse.enabled))
      .catch(() => setEnabled(false))
  }, [])
  return enabled
}
