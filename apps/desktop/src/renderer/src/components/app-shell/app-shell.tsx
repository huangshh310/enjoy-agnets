/**
 * 全应用唯一铬：轨道+情境 | 工作台 | Inspector。切模块不卸载会话与右栏。
 */
import { SetupGuideHost } from "@renderer/components/setup-guide/setup-guide-host"
import { CreateProjectHost } from "@renderer/components/workspace/create-project-host"
import { RemoteStatusStrip } from "@renderer/components/settings/workspace/remote-status-strip"
import { NavCard } from "./chrome/nav-card"
import { StageSplit } from "./layout/stage-split"
import { useShellNavigation } from "./routing/use-shell-navigation"

export function AppShell() {
  const { activeModule, isChat, selectModule } = useShellNavigation()
  return (
    <div className="relative flex h-full min-h-0 gap-3 bg-background-full px-3 pb-3 overflow-hidden">
      {/* 物理底板柔和漫射环境光 (Ambient Canvas Glow) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50 dark:opacity-35 transition-opacity duration-1000 select-none"
      >
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-accent-500/10 blur-[100px]" />
        <div className="absolute -right-20 top-1/3 h-[420px] w-[420px] rounded-full bg-accent-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-chart-5/6 blur-[110px]" />
      </div>

      <SetupGuideHost />
      <CreateProjectHost />
      <NavCard activeModule={activeModule} isChat={isChat} onSelect={selectModule} />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <RemoteStatusStrip />
        <StageSplit isChat={isChat} activeModule={activeModule} />
      </div>
    </div>
  )
}
