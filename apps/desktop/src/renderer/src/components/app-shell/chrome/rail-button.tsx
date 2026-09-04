/**
 * 轨道图标按钮。运行中的 Chat 用 pulse 点，不用静态圆。
 */
import { cx } from "@/utils/cx"
import type { ActivityIcon } from "./module-registry"

export function RailButton({
  active,
  label,
  icon: Icon,
  pulse,
  onClick
}: {
  active: boolean
  label: string
  icon: ActivityIcon
  pulse?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cx(
        "group relative flex size-9 cursor-pointer items-center justify-center rounded-2lg outline-none transition-all duration-200 ease-out active:scale-90",
        active
          ? "bg-background-secondary-default text-text-primary shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      {/* 激活状态左侧灵动指示条 (Active Indicator) */}
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
      {pulse ? (
        <span className="absolute right-1.5 top-1.5 flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-accent-500" />
        </span>
      ) : null}
    </button>
  )
}
