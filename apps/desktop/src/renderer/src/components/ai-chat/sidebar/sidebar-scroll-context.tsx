/**
 * 侧栏既有 overflow-y-auto 滚动容器 → 喂给会话行 virtua scrollRef；勿另起第二滚动栈。
 */
import { createContext, useContext, type ReactNode, type RefObject } from "react"

export type SidebarScrollContextValue = {
  scrollRef: RefObject<HTMLElement | null>
}

const SidebarScrollContext = createContext<SidebarScrollContextValue | null>(null)

export function SidebarScrollProvider({
  value,
  children
}: {
  value: SidebarScrollContextValue
  children: ReactNode
}) {
  return <SidebarScrollContext.Provider value={value}>{children}</SidebarScrollContext.Provider>
}

export function useSidebarScrollRef(): RefObject<HTMLElement | null> | null {
  return useContext(SidebarScrollContext)?.scrollRef ?? null
}
