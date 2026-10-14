/**
 * 第一张卡：轨道 + 情境栏。宽度走 constants，折叠只留轨道。
 * 窄窗（< NARROW_SIDEBAR_PX）展开时改为浮层盖在主区上，不挤压主区；点外部 / Esc / 选中会话关掉（luna z151-1）。
 */
import { useEffect, useRef, type MouseEvent } from "react"
import { useRouterState } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { APP_REGION_NO_DRAG_STYLE } from "@renderer/lib/app-region"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AppModuleId } from "../app-shell.types"
import { NAV_CARD_COLLAPSED_PX, NAV_CARD_EXPANDED_PX, NARROW_SIDEBAR_PX } from "../constants"
import { ActivityBar } from "./activity-bar"
import { ContextColumn } from "./context-column"
import { createOverlayNavWatcher, overlayClickClosesAfterSelect, overlayKeyAction } from "./nav-overlay-keys"
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
  const narrow = useChatStore((state) => state.sidebarCollapseState.narrow)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
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
    return () => {
      if (previous && previous.isConnected && !aside?.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [overlay])

  // 浮层内：Tab 循环不出浮层；Esc 只在焦点在浮层内或页面无聚焦时关，不抢菜单 / 弹窗的 Esc（leo #154 S1 / S-a）。
  useEffect(() => {
    if (!overlay) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      const aside = asideRef.current
      if (!aside) return
      const active = document.activeElement
      const items = overlayFocusables(aside)
      const action = overlayKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        defaultPrevented: event.defaultPrevented,
        focusInside: Boolean(active && aside.contains(active)),
        nothingFocused: !active || active === document.body,
        atFirst: active === items[0],
        atLast: active === items[items.length - 1]
      })
      if (action === "none") return
      event.preventDefault()
      event.stopPropagation()
      if (action === "dismiss") dismissOverlay()
      else if (action === "wrap-first") items[0]?.focus()
      else items[items.length - 1]?.focus()
    }
    // 捕获阶段：先于全局 Shift+Tab 快捷键，焦点陷阱内的 Tab 不外泄。
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [overlay, dismissOverlay])

  // 浮层里点会话行（包括当前会话）：冒泡阶段、等行自己的 onClick 发出切换后再关（luna #154-1：先关会卸载行吃掉导航）。
  function handleOverlayClick(event: MouseEvent<HTMLElement>) {
    if (!overlay || !(event.target instanceof Element)) return
    if (!overlayClickClosesAfterSelect(event.target)) return
    window.setTimeout(() => dismissOverlay(), 0)
  }

  // 路由或会话变化（看板、自动化、轨道、会话行……所有导航入口）：统一关浮层（luna #154-2）。
  const navKey = `${pathname}|${sessionId ?? ""}`
  const dismissRef = useRef(dismissOverlay)
  dismissRef.current = dismissOverlay
  const watchNav = useRef(createOverlayNavWatcher(navKey, () => dismissRef.current()))
  useEffect(() => {
    watchNav.current(navKey, overlay)
  }, [navKey, overlay])

  function handleSelect(moduleId: AppModuleId, to: string) {
    // S2：窄窗判断统一走 store。宽窗收起时点轨道展开；窄窗浮层里切模块就关浮层（leo #154 S3）。
    if (collapsed && !narrow) setCollapsed(false)
    onSelect(moduleId, to)
    // 轨道里再点当前模块（路由不变）也关浮层（leo #154 S3）；导航已同步发出，不会被卸载吃掉。
    if (overlay) dismissOverlay()
  }

  const card = (
    <aside
      ref={asideRef}
      onClick={overlay ? handleOverlayClick : undefined}
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

function overlayFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}
