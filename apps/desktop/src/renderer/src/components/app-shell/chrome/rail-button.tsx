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
        "relative flex size-9 cursor-pointer items-center justify-center rounded-2lg outline-none transition-colors",
        active
          ? "bg-background-secondary-default text-text-primary shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      <Icon
        className={cx("size-4.5", active ? "text-accent-500" : "text-foreground-icon-secondary")}
        aria-hidden
      />
      {pulse ? (
        <span
          className="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-accent-500"
          aria-hidden
        />
      ) : null}
    </button>
  )
}
