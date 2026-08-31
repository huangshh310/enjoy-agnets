import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RiArrowLeftSLine, RiCloseLine, RiDashboardLine, RiSearchLine } from "@remixicon/react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cx } from "@/utils/cx"

type IconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type SecondaryNavItem = {
  id: string
  label: string
  icon: IconComponent
  keywords?: string[]
  meta?: string
}

export type SecondaryNavGroup = {
  id: string
  label: string
  items: SecondaryNavItem[]
}

export function SecondaryPageShell({
  searchPlaceholder = "Search...",
  groups,
  selectedId,
  onSelect,
  children,
  contentWidth = "article",
  searchValue,
  onSearchChange,
  filterNav = true,
  breadcrumbTitle
}: {
  searchPlaceholder?: string
  groups: SecondaryNavGroup[]
  selectedId: string
  onSelect: (id: string) => void
  children: ReactNode
  contentWidth?: "article" | "wide" | "stage"
  searchValue?: string
  onSearchChange?: (value: string) => void
  filterNav?: boolean
  breadcrumbTitle?: string
}) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState("")
  const query = searchValue ?? uncontrolledQuery

  function setQuery(value: string) {
    if (onSearchChange) onSearchChange(value)
    else setUncontrolledQuery(value)
  }

  const selectedItemLabel = useMemo(() => {
    if (breadcrumbTitle) return breadcrumbTitle
    for (const group of groups) {
      const item = group.items.find((i) => i.id === selectedId)
      if (item) return item.label
    }
    return groups[0]?.label || "Section"
  }, [breadcrumbTitle, groups, selectedId])

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!filterNav || !normalized) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLocaleLowerCase()
          return haystack.includes(normalized)
        })
      }))
      .filter((group) => group.items.length > 0)
  }, [filterNav, groups, query])

  return (
    <div className="flex h-full min-h-0 bg-background-full pb-3">
      <aside className="flex w-[240px] shrink-0 flex-col px-3 py-2">
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1 rounded-2lg px-2 py-1.5 text-body-medium font-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring transition-colors"
        >
          <RiArrowLeftSLine className="size-4" aria-hidden />
          <span>Back to app</span>
        </Link>

        <label className="mb-4 relative flex h-9 items-center gap-2 rounded-full border border-border-button-default/50 bg-background-tertiary-default px-3 focus-within:border-accent-500/50 focus-within:bg-background-primary-default focus-within:ring-2 focus-within:ring-accent-500/20 transition-all shadow-2xs">
          <RiSearchLine className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-text-tertiary hover:text-text-primary"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          ) : null}
        </label>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 pr-1">
            {visibleGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <p className="px-2 text-caption-2-medium uppercase tracking-wider text-text-tertiary">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const selected = item.id === selectedId
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cx(
                        "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all",
                        selected
                          ? "bg-background-tertiary-default text-text-primary font-semibold shadow-2xs border border-border-button-default/60"
                          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                      )}
                    >
                      <Icon
                        className={cx(
                          "size-4 shrink-0 transition-colors",
                          selected ? "text-accent-500" : "text-foreground-icon-secondary"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-body-medium">{item.label}</span>
                      {item.meta ? (
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-mono font-medium",
                            selected
                              ? "bg-background-primary-default text-text-primary shadow-2xs"
                              : "bg-background-secondary-default text-text-tertiary"
                          )}
                        >
                          {item.meta}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
            {visibleGroups.length === 0 ? (
              <p className="px-2 text-caption-1-medium text-text-tertiary">No matching items.</p>
            ) : null}
          </nav>
        </ScrollArea>
      </aside>

      <main className="my-3 mr-3 min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background-primary-default shadow-card border border-border-button-default/40">
        <ScrollArea className="h-full">
          <div
            className={cx(
              "w-full",
              contentWidth === "article" && "mx-auto max-w-[760px] px-8 pt-8 pb-16",
              contentWidth === "wide" && "mx-auto max-w-5xl px-8 pt-8 pb-16",
              contentWidth === "stage" && "flex min-h-full flex-col px-8 pt-6 pb-16"
            )}
          >
            {/* Top Breadcrumb Bar */}
            <div className="mb-6 flex items-center justify-between border-b border-separator-border/60 pb-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <Link
                      to="/studio"
                      className="flex items-center gap-1 text-caption-1-medium text-text-secondary hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                    >
                      <RiDashboardLine className="size-3.5 text-accent-500" />
                      <span>Agent Studio</span>
                    </Link>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-caption-1-medium font-semibold text-text-primary">
                      {selectedItemLabel}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Link
                to="/"
                className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary hover:text-text-primary transition-colors"
              >
                <span>Back to chat</span>
              </Link>
            </div>

            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}

