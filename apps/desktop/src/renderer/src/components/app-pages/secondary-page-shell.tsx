/**
 * 工作模块 Stage：向情境栏登记导航，主卡片交给 SecondaryPageMain。
 */
import { useState, type ReactNode } from "react"
import { useRegisterModuleNav } from "@renderer/components/app-shell/chrome/module-nav-store"
import { resolveNavLabel } from "./resolve-nav-label"
import type { SecondaryNavGroup } from "./secondary-nav.types"
import { SecondaryPageMain, type SecondaryContentWidth } from "./secondary-page-main"

export type { SecondaryNavGroup, SecondaryNavItem } from "./secondary-nav.types"

export type SecondaryPageShellProps = {
  searchPlaceholder?: string
  groups: SecondaryNavGroup[]
  selectedId: string
  onSelect: (id: string) => void
  children: ReactNode
  contentWidth?: SecondaryContentWidth
  searchValue?: string
  onSearchChange?: (value: string) => void
  filterNav?: boolean
  breadcrumbTitle?: string
}

export function SecondaryPageShell({
  searchPlaceholder,
  groups,
  selectedId,
  onSelect,
  children,
  contentWidth = "article",
  searchValue,
  onSearchChange,
  filterNav = true,
  breadcrumbTitle
}: SecondaryPageShellProps) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState("")
  const query = searchValue ?? uncontrolledQuery

  function setQuery(value: string) {
    if (onSearchChange) onSearchChange(value)
    else setUncontrolledQuery(value)
  }

  useRegisterModuleNav({
    groups,
    selectedId,
    onSelect,
    searchPlaceholder,
    searchValue: query,
    onSearchChange: setQuery,
    filterNav,
    breadcrumbTitle,
    contentWidth
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <SecondaryPageMain
        contentWidth={contentWidth}
        selectedItemLabel={resolveNavLabel(groups, selectedId, breadcrumbTitle)}
      >
        {children}
      </SecondaryPageMain>
    </div>
  )
}
