/**
 * Chat 可见时把会话题交给主进程写任务栏。
 * 占位题按语言显示「新对话」，不要把库里的 New agent 摊出去。
 * 设置、知识库等模块传空串，主进程恢复 Enjoy Agents。
 */
import { useEffect } from "react"
import { useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { displaySessionTitle } from "@renderer/lib/session-title"
import { setTaskbarTitle } from "@renderer/lib/window-control"
import { matchAppModule } from "../routing/match-module"

export function useTaskbarTitle(sessionTitle: string): void {
  const t = useT()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  useEffect(() => {
    const label =
      matchAppModule(pathname) === "chat" ? displaySessionTitle(sessionTitle, t("chat.newAgent")) : ""
    void setTaskbarTitle(label)
  }, [pathname, sessionTitle, t])
}
