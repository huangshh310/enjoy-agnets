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

type ModuleNavStore = ModuleNavSnapshot & {
  setNav: (next: ModuleNavSnapshot) => void
  clear: () => void
}

export const useModuleNavStore = create<ModuleNavStore>((set) => ({
  ...EMPTY_NAV,
  setNav: (next) => set(next),
  clear: () => set(EMPTY_NAV)
}))

/** 页面渲染时把情境栏数据推给 AppShell；卸载时清空。 */
export function useRegisterModuleNav(nav: ModuleNavSnapshot): void {
  const setNav = useModuleNavStore((state) => state.setNav)
  const clear = useModuleNavStore((state) => state.clear)

  useLayoutEffect(() => {
    setNav(nav)
  })

  useLayoutEffect(() => {
    return () => clear()
  }, [clear])
}
