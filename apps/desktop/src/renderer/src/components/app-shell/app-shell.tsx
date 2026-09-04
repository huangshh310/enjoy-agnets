/**
 * 全应用唯一铬：轨道+情境 | 工作台 | Inspector。切模块不卸载会话与右栏。
 */
import { NavCard } from "./chrome/nav-card"
import { StageSplit } from "./layout/stage-split"
import { useShellNavigation } from "./routing/use-shell-navigation"

export function AppShell() {
  const { activeModule, isChat, selectModule } = useShellNavigation()
  return (
    <div className="flex h-full min-h-0 gap-3 bg-background-full px-3 pb-3">
      <NavCard activeModule={activeModule} isChat={isChat} onSelect={selectModule} />
      <StageSplit isChat={isChat} />
    </div>
  )
}
