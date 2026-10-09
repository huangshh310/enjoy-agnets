/**
 * 模块切换、记住工位、Escape 回工位（不抢 Dialog 的 Esc）。
 */
import { useEffect } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"
import type { AppModuleId } from "../app-shell.types"
import { isOverlayModule, isWorkModule, matchAppModule, pathForWorkModule } from "./match-module"
import { readLastWorkModule, writeLastWorkModule } from "./last-work-module"

export function useShellNavigation() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeModule = matchAppModule(pathname)
  const isChat = activeModule === "chat"

  useEffect(() => {
    if (isWorkModule(activeModule)) writeLastWorkModule(activeModule)
  }, [activeModule])

  useKeybindingCommand("nav.back", () => {
    if (!canLeaveOverlay(activeModule)) return false
    void navigate({ to: pathForWorkModule(readLastWorkModule()) as "/" })
    return true
  })

  function selectModule(_id: AppModuleId, to: string) {
    void navigate({ to: to as "/" })
  }

  return { activeModule, isChat, selectModule }
}

function canLeaveOverlay(activeModule: AppModuleId): boolean {
  if (!isOverlayModule(activeModule)) return false
  const target = document.activeElement
  if (!(target instanceof HTMLElement)) return true
  if (target.closest('[role="dialog"]')) return false
  if (target.closest("input, textarea, [contenteditable='true']")) return false
  return true
}
