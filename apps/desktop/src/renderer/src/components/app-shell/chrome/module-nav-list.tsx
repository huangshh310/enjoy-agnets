/**
 * 情境栏分组列表。选中行用 caption semibold，不叠 font-semibold。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"

export function ModuleNavList({
  groups,
  selectedId,
  onSelect
}: {
  groups: SecondaryNavGroup[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const t = useT()
  return (
    <nav className="flex flex-col gap-4 pr-1">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1">
          <p className="px-2.5 text-caption-2-semibold uppercase tracking-wider text-text-tertiary">
            {group.label}
          </p>
          {group.items.map((item) => (
            <NavRow
              key={item.id}
              id={item.id}
              selected={item.id === selectedId}
              label={item.label}
              meta={item.meta}
              icon={item.icon}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      ))}
      {groups.length === 0 ? (
        <p className="px-2.5 text-caption-1-medium text-text-tertiary">{t("common.noMatchingItems")}</p>
      ) : null}
    </nav>
  )
}

function navItemBadgeTheme(id: string, selected: boolean) {
  switch (id) {
    case "general":
      return selected
        ? "bg-slate-500/15 text-slate-700 dark:text-slate-200"
        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 group-hover:bg-slate-500/15"
    case "appearance":
      return selected
        ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.25)]"
        : "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/15"
    case "shortcuts":
      return selected
        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
        : "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/15"
    case "providers":
      return selected
        ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
        : "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/15"
    case "agent":
      return selected
        ? "bg-accent-500/20 text-accent-500 shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        : "bg-accent-500/10 text-accent-500 group-hover:bg-accent-500/15"
    case "instructions":
    case "skills":
    case "rules":
      return selected
        ? "bg-pink-500/20 text-pink-600 dark:text-pink-300"
        : "bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/15"
    case "workspace":
      return selected
        ? "bg-blue-500/20 text-blue-600 dark:text-blue-300"
        : "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/15"
    case "mcp":
      return selected
        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
        : "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15"
    case "team":
    case "members":
    case "billing":
      return selected
        ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300"
        : "bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500/15"
    default:
      return selected
        ? "bg-accent-500/15 text-accent-500"
        : "bg-background-secondary-default text-text-tertiary group-hover:bg-background-secondary-hover"
  }
}

function NavRow({
  id,
  selected,
  label,
  meta,
  icon: Icon,
  onClick
}: {
  id: string
  selected: boolean
  label: string
  meta?: string
  icon: SecondaryNavGroup["items"][number]["icon"]
  onClick: () => void
}) {
  const badgeStyle = navItemBadgeTheme(id, selected)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-200 ease-out active:scale-[0.98]",
        selected
          ? "border border-border-button-default/90 bg-background-primary-default text-text-primary shadow-xs"
          : "text-text-secondary hover:bg-background-secondary-hover/80 hover:text-text-primary hover:translate-x-0.5"
      )}
    >
      {selected ? (
        <div className="absolute -left-1 bottom-2 top-2 w-1 rounded-r-full bg-accent-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-in fade-in zoom-in-75 duration-200" />
      ) : null}
      <div className={cx("flex size-6.5 shrink-0 items-center justify-center rounded-lg transition-all duration-200", badgeStyle)}>
        <Icon className="size-3.5" aria-hidden />
      </div>
      <span className={cx("min-w-0 flex-1 truncate transition-colors", selected ? "text-caption-1-semibold" : "text-caption-1-medium")}>
        {label}
      </span>
      {meta ? (
        <span
          className={cx(
            "rounded-full px-2 py-0.5 font-mono",
            selected
              ? "bg-accent-500/10 text-caption-2-semibold text-accent-600"
              : "bg-background-secondary-default text-caption-2-medium text-text-tertiary"
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  )
}
