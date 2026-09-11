/**
 * 窗口最外层容器框架
 * 负责无边框模式下的整体圆角、外边框以及拖拽顶部标题栏
 */
import { useEffect, useState, type ReactNode } from "react"
import { cx } from "@/utils/cx"
import {
  checkIsMaximized,
  onMaximizedChange,
  toggleMaximizeWindow
} from "@renderer/lib/window-control"
import { AppUpdateHost } from "@renderer/components/app-update/app-update-host"
import { WindowTitleBar } from "./window-title-bar"
import { InkSketchFilters } from "./ink-sketch-filters"
import { LiquidGlassFilters } from "./liquid-glass-filters"


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
    void toggleMaximizeWindow().then(setIsMaximized)
  }

  return (
    <div
      data-testid="window-frame"
      className={cx(
        "relative flex h-full w-full flex-col overflow-hidden bg-background-full select-none",
        isMaximized
          ? "rounded-none border-0"
          : "rounded-2xl border border-border-button-default"
      )}
    >
      <InkSketchFilters />
      <LiquidGlassFilters />

      {/* 玻璃皮肤流体液态画布与多节点动态光斑 */}
      <div
        aria-hidden="true"
        className="skin-glass-orbs pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      >
        <div className="skin-glass-mesh-gradient" />
        <span className="skin-glass-orb skin-glass-orb-nw" />
        <span className="skin-glass-orb skin-glass-orb-ne" />
        <span className="skin-glass-orb skin-glass-orb-s" />
      </div>

      <AppUpdateHost />
      <WindowTitleBar
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      <div className="relative z-10 min-h-0 min-w-0 flex-1 overflow-hidden select-text">
        {children}
      </div>
    </div>
  )

}
