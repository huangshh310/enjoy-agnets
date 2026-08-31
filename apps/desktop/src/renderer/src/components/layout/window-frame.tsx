/**
 * 窗口最外层容器框架
 * 负责无边框模式下的整体圆角、外边框以及拖拽顶部标题栏
 */
import { useEffect, useState, type ReactNode } from "react"
import {
  checkIsMaximized,
  onMaximizedChange,
  toggleMaximizeWindow
} from "@renderer/lib/window-control"
import { WindowTitleBar } from "./window-title-bar"

export function WindowFrame({ children }: { children: ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    void checkIsMaximized().then(setIsMaximized)

    const unsubscribe = onMaximizedChange((maximized) => {
      setIsMaximized(maximized)
    })

    const handleResize = () => {
      void checkIsMaximized().then(setIsMaximized)
    }

    window.addEventListener("resize", handleResize)
    return () => {
      unsubscribe()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const handleToggleMaximize = () => {
    void toggleMaximizeWindow()
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-full select-none">
      <WindowTitleBar
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden select-text">
        {children}
      </div>
    </div>
  )
}
