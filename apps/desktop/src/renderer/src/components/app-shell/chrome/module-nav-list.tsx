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

function NavRow({
  selected,
  label,
  meta,
  icon: Icon,
  onClick
}: {
  selected: boolean
  label: string
  meta?: string
  icon: SecondaryNavGroup["items"][number]["icon"]
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all",
        selected
          ? "border border-border-button-default bg-background-primary-default text-text-primary shadow-xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      {selected ? <div className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-accent-500" /> : null}
      <Icon className={cx("size-4 shrink-0", selected ? "text-accent-500" : "text-text-tertiary")} aria-hidden />
      <span className={cx("min-w-0 flex-1 truncate", selected ? "text-caption-1-semibold" : "text-caption-1-medium")}>
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
