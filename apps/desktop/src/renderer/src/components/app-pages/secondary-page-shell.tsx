import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RiArrowLeftSLine, RiSearchLine } from "@remixicon/react"
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
  filterNav = true
}: {
  searchPlaceholder?: string
  groups: SecondaryNavGroup[]
  selectedId: string
  onSelect: (id: string) => void
  children: ReactNode
  contentWidth?: "article" | "stage"
  searchValue?: string
  onSearchChange?: (value: string) => void
  filterNav?: boolean
}) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState("")
  const query = searchValue ?? uncontrolledQuery

  function setQuery(value: string) {
    if (onSearchChange) onSearchChange(value)
    else setUncontrolledQuery(value)
  }

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
    <div className="flex h-full min-h-0 bg-background-full">
      <aside className="flex w-[240px] shrink-0 flex-col px-3 py-4">
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-0.5 rounded-2lg px-2 py-1.5 text-body-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiArrowLeftSLine className="size-4" aria-hidden />
          Back to app
        </Link>

        <label className="mb-4 flex h-9 items-center gap-2 rounded-full bg-background-tertiary-default px-3">
          <RiSearchLine className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </label>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 pr-1">
            {visibleGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <p className="px-2 text-caption-1-medium text-text-tertiary">{group.label}</p>
                {group.items.map((item) => {
                  const selected = item.id === selectedId
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cx(
                        "flex w-full items-center gap-2 rounded-2lg px-2 py-1.5 text-left",
                        selected
                          ? "bg-background-tertiary-default text-text-primary"
                          : "text-text-secondary hover:bg-background-secondary-hover"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-body-medium">{item.label}</span>
                      {item.meta ? (
                        <span className="text-caption-1-medium text-text-tertiary">{item.meta}</span>
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

      <main className="my-3 mr-3 min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background-primary-default shadow-card">
        <ScrollArea className="h-full">
          <div
            className={cx(
              "w-full",
              contentWidth === "article" ? "mx-auto max-w-[720px] px-10 py-10" : "flex min-h-full flex-col px-8 py-6"
            )}
          >
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
