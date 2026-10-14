/**
 * 第一张卡：轨道 + 情境栏。宽度走 constants，折叠只留轨道。
 * 窄窗（< NARROW_SIDEBAR_PX）展开时改为浮层盖在主区上，不挤压主区；点外部 / Esc / 选中会话关掉（luna z151-1）。
 */
import { useEffect, useRef } from "react"
import { useT } from "@renderer/i18n"
import { APP_REGION_NO_DRAG_STYLE } from "@renderer/lib/app-region"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AppModuleId } from "../app-shell.types"
import { NAV_CARD_COLLAPSED_PX, NAV_CARD_EXPANDED_PX, NARROW_SIDEBAR_PX } from "../constants"
import { ActivityBar } from "./activity-bar"
import { ContextColumn } from "./context-column"
import { sidebarOverlay } from "./sidebar-collapse-state"

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function NavCard({
  activeModule,
  isChat,
  onSelect
}: {
  activeModule: AppModuleId
  isChat: boolean
  onSelect: (moduleId: AppModuleId, to: string) => void
}) {
  const t = useT()
  const collapsed = useChatStore((state) => state.sidebarCollapsed)
  const overlay = useChatStore((state) => sidebarOverlay(state.sidebarCollapseState))
  const setCollapsed = useChatStore((state) => state.setSidebarCollapsed)
  const dismissOverlay = useChatStore((state) => state.dismissSidebarOverlay)
  const running = useChatStore((state) => state.running)
  const sessionId = useChatStore((state) => state.sessionId)
  const asideRef = useRef<HTMLElement>(null)

  const setNarrow = useChatStore((state) => state.setSidebarNarrow)

  useEffect(() => {
    // 窄窗（< NARROW_SIDEBAR_PX）本次运行自动收起，不写偏好；回到宽窗恢复偏好（luna 5042 / leo #151）。
    const check = () => setNarrow(window.innerWidth < NARROW_SIDEBAR_PX)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [setNarrow])

  // 浮层打开：焦点进情境栏第一个可聚焦项；关掉后还给打开前的元素（多半是标题栏的侧栏开关）。
  useEffect(() => {
    if (!overlay) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const aside = asideRef.current
    const target =
      aside?.querySelector<HTMLElement>(`[data-nav-context] :is(${FOCUSABLE})`) ??
      aside?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      // 浮层里开着的菜单 / 弹层先吃 Esc。
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return
      event.preventDefault()
      dismissOverlay()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      if (previous && previous.isConnected && !aside?.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [overlay, dismissOverlay])

  // 浮层里选中会话：直接回到主区。
  const lastSession = useRef(sessionId)
  useEffect(() => {
    if (lastSession.current === sessionId) return
    lastSession.current = sessionId
    if (overlay) dismissOverlay()
  }, [sessionId, overlay, dismissOverlay])

  function handleSelect(moduleId: AppModuleId, to: string) {
    if (collapsed && window.innerWidth >= NARROW_SIDEBAR_PX) setCollapsed(false)
    onSelect(moduleId, to)
  }

  const card = (
    <aside
      ref={asideRef}
      data-testid="nav-card"
      data-collapsed={collapsed ? "true" : "false"}
      data-overlay={overlay ? "true" : "false"}
      role={overlay ? "dialog" : undefined}
      aria-modal={overlay ? true : undefined}
      aria-label={overlay ? t("chat.collapseSidebar") : undefined}
      style={{ width: collapsed ? NAV_CARD_COLLAPSED_PX : NAV_CARD_EXPANDED_PX }}
      className={
        overlay
          ? "absolute inset-y-0 left-0 z-50 flex shrink-0 overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default shadow-card"
          : "flex h-full shrink-0 overflow-hidden rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar transition-[width] duration-300 ease-in-out"
      }
    >
      <ActivityBar
        activeModule={activeModule}
        collapsed={collapsed}
        running={running}
        onSelect={handleSelect}
      />
      {collapsed ? null : (
        <div data-nav-context className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ContextColumn isChat={isChat} />
        </div>
      )}
    </aside>
  )

  if (!overlay) return card
  // 窄窗浮层：原位只留轨道宽的占位，主区不动；遮罩点一下就关。
  return (
    <div data-testid="nav-card-slot" className="relative h-full shrink-0" style={{ width: NAV_CARD_COLLAPSED_PX }}>
      <div
        data-testid="nav-card-scrim"
        aria-hidden
        style={APP_REGION_NO_DRAG_STYLE}
        className="fixed inset-0 z-40 bg-black/25 [app-region:no-drag]"
        onPointerDown={(event) => {
          event.preventDefault()
          dismissOverlay()
        }}
      />
      {card}
    </div>
  )
}
