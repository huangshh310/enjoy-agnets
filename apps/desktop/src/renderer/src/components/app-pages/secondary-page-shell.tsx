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
import { useT } from "@renderer/i18n"

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
  const t = useT()
  const [uncontrolledQuery, setUncontrolledQuery] = useState("")
  const query = searchValue ?? uncontrolledQuery
  const placeholder = searchPlaceholder ?? t("common.searchSettings")

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
    <div className="flex h-full min-h-0 gap-3 bg-background-full px-3 pb-3">
      <aside className="flex w-[248px] shrink-0 flex-col rounded-3xl px-3.5 py-3">
        <Link
          to="/"
          className="group mb-3 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-caption-1-medium font-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-500/30 transition-all"
        >
          <RiArrowLeftSLine className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          <span>{t("common.backToApp")}</span>
        </Link>

        <label className="mb-3.5 relative flex h-9 items-center gap-2 rounded-xl border border-border-button-default/60 bg-background-tertiary-default/80 px-3 focus-within:border-accent-500 focus-within:bg-background-primary-default focus-within:ring-2 focus-within:ring-accent-500/20 transition-all shadow-2xs">
          <RiSearchLine className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-caption-1-medium text-text-primary outline-none placeholder:text-text-tertiary"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-0.5 text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          ) : null}
        </label>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 pr-1">
            {visibleGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
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
                        "relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all",
                        selected
                          ? "bg-background-primary-default text-text-primary font-semibold shadow-xs border border-border-button-default"
                          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                      )}
                    >
                      {selected ? (
                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent-500" />
                      ) : null}
                      <Icon
                        className={cx(
                          "size-4 shrink-0 transition-colors",
                          selected ? "text-accent-500" : "text-text-tertiary group-hover:text-text-secondary"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-caption-1-medium">{item.label}</span>
                      {item.meta ? (
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-mono font-medium",
                            selected
                              ? "bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold"
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
              <p className="px-2.5 text-caption-1-medium text-text-tertiary">{t("common.noMatchingItems")}</p>
            ) : null}
          </nav>
        </ScrollArea>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background-primary-default shadow-card border border-border-button-default/40">
        <ScrollArea className="h-full">
          <div
            className={cx(
              "w-full",
              contentWidth === "article" && "mx-auto max-w-[760px] px-8 pt-7 pb-16",
              contentWidth === "wide" && "mx-auto max-w-5xl px-8 pt-7 pb-16",
              contentWidth === "stage" && "flex min-h-full flex-col px-8 pt-6 pb-16"
            )}
          >
            {/* Top Breadcrumb Bar */}
            <div className="mb-6 flex items-center justify-between border-b border-separator-border/60 pb-3.5">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <Link
                      to="/studio"
                      className="flex items-center gap-1.5 text-caption-1-medium text-text-secondary hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                    >
                      <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
                        <RiDashboardLine className="size-3.5" />
                      </div>
                      <span>{t("common.agentStudio")}</span>
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

              <div className="flex items-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <RiDashboardLine className="size-3.5" />
                  <span>{t("common.studioHub")}</span>
                </Link>
                <span className="text-border-button-default">|</span>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <span>{t("common.chatStage")}</span>
                </Link>
              </div>
            </div>

            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}

