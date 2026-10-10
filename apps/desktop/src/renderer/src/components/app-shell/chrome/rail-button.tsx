/**
 * 轨道图标按钮。Inbox 可行动计数用数字徽标，不用脉冲假活。
 */
import { cx } from "@/utils/cx"
import type { ActivityIcon } from "./module-registry"

export function RailButton({
  id,
  active,
  label,
  icon: Icon,
  pulse,
  count,
  onClick
}: {
  id?: string
  active: boolean
  label: string
  icon: ActivityIcon
  pulse?: boolean
  count?: number
  onClick: () => void
}) {
  const badge = count && count > 0 ? (count > 99 ? "99+" : String(count)) : null
  return (
    <button
      type="button"
      data-testid={id ? `rail-${id}` : undefined}
      title={label}
      aria-label={badge ? `${label} ${badge}` : label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cx(
        "group relative flex size-9 cursor-pointer items-center justify-center rounded-2lg outline-none transition-all duration-200 ease-out active:scale-90",
        active
          ? "bg-background-secondary-default text-text-primary shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute -left-1.5 h-4 w-1 rounded-r-full bg-accent-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-in fade-in-50 zoom-in-75 duration-200"
        />
      ) : null}
      <Icon
        className={cx(
          "size-4.5 transition-transform duration-200 group-hover:scale-105",
          active ? "text-accent-500" : "text-foreground-icon-secondary"
        )}
        aria-hidden
      />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-3.5 rounded-full bg-background-tertiary-error px-1 text-center font-mono text-caption-2-regular leading-4 text-text-error-primary">
          {badge}
        </span>
      ) : null}
      {!badge && pulse ? (
        <span className="absolute right-1.5 top-1.5 flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-accent-500" />
        </span>
      ) : null}
    </button>
  )
}
