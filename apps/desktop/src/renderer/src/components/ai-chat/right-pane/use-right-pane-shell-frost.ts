/**
 * 右栏是否挂 glass/ink/sketch 外壳装饰（棱镜环、斜纹底）。
 * 启动页与整个审查栏（空态和有文件）都不渲染装饰，禁止靠不透明底盖住。
 */
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import { shouldRightPaneShellFrost } from "./right-pane-shell-frost.logic"

export function useRightPaneShellFrost() {
  const tabs = useRightPaneStore((state) => state.tabs)
  const activeId = useRightPaneStore((state) => state.activeId)
  const emptyPicker = tabs.length === 0
  const reviewActive = tabs.find((tab) => tab.id === activeId)?.kind === "review"
  const shellFrost = shouldRightPaneShellFrost({ emptyPicker, reviewActive })
  return { shellFrost, emptyPicker, reviewActive }
}
