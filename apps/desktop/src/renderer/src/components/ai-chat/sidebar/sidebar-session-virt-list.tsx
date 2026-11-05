/**
 * 侧栏会话行 virtua 列表层：同库 virtua@0.49.3 Virtualizer；仍渲染 SidebarSessionRow。
 * 估高 h-7≈28px + measure；打开态菜单 sessionId → keepMounted。
 */
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactElement } from "react"
import { Virtualizer, type VirtualizerHandle } from "virtua"
import { useSidebarScrollRef } from "@renderer/components/ai-chat/sidebar/sidebar-scroll-context"
import {
  getOpenSessionMenuId,
  subscribeOpenSessionMenu
} from "@renderer/lib/session-menu-keep-mounted"
import { registerSessionListVirtuaScroller } from "@renderer/lib/session-list-virtua-scroll"

/** 现网行壳 h-7（28px）+ gap-0.5（2px）估高；挂载后 virtua measure 纠正。 */
export const SIDEBAR_SESSION_ITEM_ESTIMATE = 30

export type SidebarSessionVirtItem = {
  id: string
}

export function SidebarSessionVirtList<T extends SidebarSessionVirtItem>({
  sessions,
  renderRow,
  listTestId = "sidebar-session-virt"
}: {
  sessions: readonly T[]
  renderRow: (session: T, index: number) => ReactElement
  listTestId?: string
}) {
  const scrollRef = useSidebarScrollRef()
  const virtuaRef = useRef<VirtualizerHandle>(null)
  const openMenuId = useSyncExternalStore(subscribeOpenSessionMenu, getOpenSessionMenuId, () => null)

  const idToIndex = useMemo(() => {
    const map = new Map<string, number>()
    for (let index = 0; index < sessions.length; index += 1) {
      const session = sessions[index]
      if (session) map.set(session.id, index)
    }
    return map
  }, [sessions])

  const keepMounted = useMemo(() => {
    if (!openMenuId) return undefined
    const index = idToIndex.get(openMenuId)
    return index == null ? undefined : [index]
  }, [openMenuId, idToIndex])

  useLayoutEffect(() => {
    return registerSessionListVirtuaScroller({
      scrollToSessionId(sessionId) {
        const index = idToIndex.get(sessionId)
        if (index == null || !virtuaRef.current) return false
        virtuaRef.current.scrollToIndex(index, { align: "nearest" })
        return true
      }
    })
  }, [idToIndex])

  if (sessions.length === 0) return null
  // 无侧栏滚动父级时退回全量（不应发生；保底不破可点）。
  if (!scrollRef) {
    return (
      <div data-testid={listTestId} data-session-virtua="false" className="flex flex-col">
        {sessions.map((session, index) => (
          <div key={session.id} className="pb-0.5">
            {renderRow(session, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div data-testid={listTestId} data-session-virtua="true">
      <Virtualizer
        ref={virtuaRef}
        scrollRef={scrollRef}
        data={sessions as T[]}
        itemSize={SIDEBAR_SESSION_ITEM_ESTIMATE}
        keepMounted={keepMounted}
      >
        {(session, index) => (
          <div
            key={session.id}
            data-session-virtua-item={session.id}
            className="pb-0.5"
          >
            {renderRow(session, index)}
          </div>
        )}
      </Virtualizer>
    </div>
  )
}
