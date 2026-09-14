/**
 * 工作模块把情境栏导航登记到这里；AppShell 第一张卡右侧读取。
 */
import { useLayoutEffect } from "react"
import { create } from "zustand"
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"
import type { SecondaryContentWidth } from "@renderer/components/app-pages/secondary-page-main"

export type ModuleNavSnapshot = {
  groups: SecondaryNavGroup[]
  selectedId: string
  onSelect: (id: string) => void
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filterNav: boolean
  breadcrumbTitle?: string
  contentWidth: SecondaryContentWidth
}

const EMPTY_NAV: ModuleNavSnapshot = {
  groups: [],
  selectedId: "",
  onSelect: () => undefined,
  filterNav: true,
  contentWidth: "stage"
}

function isSameNav(a: ModuleNavSnapshot, b: ModuleNavSnapshot): boolean {
  if (
    a.selectedId !== b.selectedId ||
    a.searchValue !== b.searchValue ||
    a.searchPlaceholder !== b.searchPlaceholder ||
    a.filterNav !== b.filterNav ||
    a.breadcrumbTitle !== b.breadcrumbTitle ||
    a.contentWidth !== b.contentWidth ||
    a.groups.length !== b.groups.length
  ) {
    return false
  }
  for (let i = 0; i < a.groups.length; i++) {
    const ga = a.groups[i]
    const gb = b.groups[i]
    if (ga.id !== gb.id || ga.label !== gb.label || ga.items.length !== gb.items.length) return false
    for (let j = 0; j < ga.items.length; j++) {
      const ia = ga.items[j]
      const ib = gb.items[j]
      if (ia.id !== ib.id || ia.label !== ib.label || ia.meta !== ib.meta) return false
    }
  }
  return true
}

type ModuleNavStore = ModuleNavSnapshot & {
  setNav: (next: ModuleNavSnapshot) => void
  clear: () => void
}

export const useModuleNavStore = create<ModuleNavStore>((set, get) => ({
  ...EMPTY_NAV,
  setNav: (next) => {
    if (isSameNav(get(), next)) return
    set(next)
  },
  clear: () => set(EMPTY_NAV)
}))

/** 页面渲染时把情境栏数据推给 AppShell；卸载时清空。 */
export function useRegisterModuleNav(nav: ModuleNavSnapshot): void {
  const setNav = useModuleNavStore((state) => state.setNav)
  const clear = useModuleNavStore((state) => state.clear)

  useLayoutEffect(() => {
    setNav(nav)
  }, [
    nav.selectedId,
    nav.searchValue,
    nav.searchPlaceholder,
    nav.filterNav,
    nav.breadcrumbTitle,
    nav.contentWidth,
    nav.groups,
    setNav
  ])

  useLayoutEffect(() => {
    return () => clear()
  }, [clear])
}
