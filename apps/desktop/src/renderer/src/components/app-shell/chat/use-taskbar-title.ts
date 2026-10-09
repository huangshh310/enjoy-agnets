/**
 * Chat 可见时把会话标题或工作区名交给主进程写任务栏。
 * 设置、知识库等模块传空串，主进程恢复 Enjoy Agents。
 */
import { useEffect } from "react"
import { useRouterState } from "@tanstack/react-router"
import { setTaskbarTitle } from "@renderer/lib/window-control"
import { matchAppModule } from "../routing/match-module"

export function useTaskbarTitle(sessionTitle: string, workspaceName: string): void {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useEffect(() => {
    const label =
      matchAppModule(pathname) === "chat" ? sessionTitle.trim() || workspaceName.trim() : ""
    void setTaskbarTitle(label)
  }, [pathname, sessionTitle, workspaceName])
}
