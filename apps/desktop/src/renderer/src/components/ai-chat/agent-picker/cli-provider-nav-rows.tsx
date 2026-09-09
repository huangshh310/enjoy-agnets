/**
 * 左栏一行：已登录用圆点；未登录用实心「登录」，不靠灰字。
 */
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { CliProviderRow } from "./cli-provider-rows"

export function NavRow({
  label,
  side,
  mark,
  selected,
  ready,
  onClick
}: {
  label: string
  side: string
  mark?: string
  selected: boolean
  ready: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "bg-background-primary-default text-text-primary shadow-2xs"
          : "text-text-secondary hover:bg-background-secondary-hover"
      )}
    >
      <span className={cx("size-1.5 shrink-0 rounded-full", ready ? "bg-accent-500" : "bg-text-tertiary")} />
      <span className="min-w-0 flex-1 truncate text-caption-2-medium">{label}</span>
      {mark ? (
        <span className="shrink-0 rounded-full bg-badge-neutral-background px-1.5 py-px text-caption-2-medium text-text-secondary">
          {mark}
        </span>
      ) : null}
      <span className="shrink-0 text-caption-2-medium text-text-tertiary">{side}</span>
    </button>
  )
}

export function PendingRow({
  row,
  selected,
  busy,
  onSelect,
  onLogin
}: {
  row: CliProviderRow
  selected: boolean
  busy: boolean
  onSelect: () => void
  onLogin: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        "flex items-center gap-1 rounded-lg px-1 py-0.5",
        selected ? "bg-background-primary-default shadow-2xs" : "hover:bg-background-secondary-hover"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate px-1 py-1 text-left text-caption-2-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {row.label}
      </button>
      <Button type="button" size="xs" disabled={busy} onClick={onLogin}>
        {busy ? t("chat.cliProviderLoggingIn") : t("chat.cliProviderLogin")}
      </Button>
    </div>
  )
}
