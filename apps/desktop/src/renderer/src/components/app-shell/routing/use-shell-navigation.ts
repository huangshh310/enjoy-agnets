/**
 * 模块切换、记住工位、Escape 回工位（不抢 Dialog 的 Esc）。
 */
import { useEffect } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!shouldReturnToWork(event, activeModule)) return
      event.preventDefault()
      void navigate({ to: pathForWorkModule(readLastWorkModule()) as "/" })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeModule, navigate])

  function selectModule(_id: AppModuleId, to: string) {
    void navigate({ to: to as "/" })
  }

  return { activeModule, isChat, selectModule }
}

function shouldReturnToWork(event: KeyboardEvent, activeModule: AppModuleId): boolean {
  if (event.key !== "Escape" || event.defaultPrevented) return false
  if (!isOverlayModule(activeModule)) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return true
  if (target.closest('[role="dialog"]')) return false
  if (target.closest("input, textarea, [contenteditable='true']")) return false
  return true
}
