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
    <nav className="flex flex-col gap-2.5 pr-1">
      {groups.map((group) => (
        <div key={group.id} data-nav-group={group.id} className="flex flex-col gap-0.5">
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

/** 徽标只走语义 token 两态：选中 accent、未选中中性。禁止 per-module 彩虹色相（ui spec 红线）。 */
function navItemBadgeTheme(selected: boolean) {
  return selected
    ? "bg-accent-500/15 text-accent-500"
    : "bg-background-secondary-default text-text-tertiary group-hover:bg-background-secondary-hover"
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
  const badgeStyle = navItemBadgeTheme(selected)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all duration-200 ease-out active:scale-[0.98]",
        selected
          ? "border border-border-button-default/90 bg-background-primary-default text-text-primary shadow-xs"
          : "text-text-secondary hover:bg-background-secondary-hover/80 hover:text-text-primary hover:translate-x-0.5"
      )}
    >
      {selected ? (
        <div className="absolute -left-1 bottom-2 top-2 w-1 rounded-r-full bg-accent-500 shadow-[0_0_8px] shadow-accent-500/60 animate-in fade-in zoom-in-75 duration-200" />
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
