/**
 * 窄窗审查栏抽屉：量分栏宽度，放不下并排时给出抽屉的位置（fixed，贴分栏右缘、从聊天顶栏下沿到底）。
 * 抽屉打开时 Esc 关（不抢菜单 / 弹窗自己的 Esc）。
 * 抽屉开着时来了审批（或带着待审批进入抽屉模式）：自动收起，不然 z-40 的抽屉盖住审批卡。
 */
import { useEffect, useRef, useState, type RefObject } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  INSPECTOR_DRAWER_TOP_INSET_PX,
  inspectorDrawerWidth,
  inspectorUsesDrawer
} from "./inspector-panel-size"

export type InspectorDrawer = {
  /** 并排放不下：审查栏走抽屉。 */
  active: boolean
  top: number
  right: number
  bottom: number
  width: number
}

const DOCKED: InspectorDrawer = { active: false, top: 0, right: 0, bottom: 0, width: 0 }

export function useInspectorDrawer(splitRef: RefObject<HTMLElement | null>): InspectorDrawer {
  const [drawer, setDrawer] = useState<InspectorDrawer>(DOCKED)

  useEffect(() => {
    const el = splitRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const next = inspectorUsesDrawer(rect.width)
        ? {
            active: true,
            top: Math.round(rect.top + INSPECTOR_DRAWER_TOP_INSET_PX),
            right: Math.max(0, Math.round(window.innerWidth - rect.right)),
            bottom: Math.max(0, Math.round(window.innerHeight - rect.bottom)),
            width: Math.round(inspectorDrawerWidth(rect.width))
          }
        : DOCKED
      setDrawer((prev) => (sameDrawer(prev, next) ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [splitRef])

  const collapsed = useChatStore((state) => state.rightPanelCollapsed)
  const open = drawer.active && !collapsed
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (!isDrawerEscape(event)) return
      event.preventDefault()
      useChatStore.getState().setRightPanelCollapsed(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // 只在「审批到来 / 进入抽屉模式」这两个时刻收一次；审批期间用户自己再打开抽屉不拦。
  const approvalId = useChatStore((state) => state.pendingApproval?.approvalId ?? null)
  const openRef = useRef(open)
  openRef.current = open
  useEffect(() => {
    if (approvalId == null || !drawer.active || !openRef.current) return
    useChatStore.getState().setRightPanelCollapsed(true)
  }, [approvalId, drawer.active])

  return drawer
}

function sameDrawer(a: InspectorDrawer, b: InspectorDrawer): boolean {
  return a.active === b.active && a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.width === b.width
}

/** 只认没人处理过的 Esc，焦点在菜单 / 列表框 / 弹窗里时让给它们。 */
function isDrawerEscape(event: KeyboardEvent): boolean {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return false
  const active = document.activeElement
  if (active instanceof Element && active.closest('[role="menu"],[role="listbox"],[role="dialog"][aria-modal="true"]')) {
    return false
  }
  return true
}
