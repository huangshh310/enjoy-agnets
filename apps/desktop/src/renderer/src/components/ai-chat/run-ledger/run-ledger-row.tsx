/**
 * 账本一行：工具 / 命令 / 错误 / 用量。点行开来源 sheet。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { RunLedgerEntry } from "./run-ledger.types"

export function RunLedgerRow({
  entry,
  selected,
  onOpen
}: {
  entry: RunLedgerEntry
  selected?: boolean
  onOpen: (entry: RunLedgerEntry) => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      data-testid="run-ledger-row"
      onClick={() => onOpen(entry)}
      className={cx(
        "flex w-full flex-col gap-0.5 px-3 py-1.5 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "bg-accent-50 ring-inset ring-2 ring-accent-500/20"
          : "hover:bg-background-secondary-hover"
      )}
    >
      <span className="truncate text-caption-1-medium text-text-primary">{entry.title}</span>
      <span
        className={cx(
          "text-caption-2-regular",
          entry.failed || entry.kind === "error" ? "text-text-warning-primary" : "text-text-tertiary"
        )}
      >
        {rowMeta(entry, selected === true, t)}
      </span>
    </button>
  )
}

function rowMeta(
  entry: RunLedgerEntry,
  selected: boolean,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  if (entry.kind === "usage") {
    const tokens = Number(entry.detail)
    return Number.isFinite(tokens)
      ? t("sessionOps.ledgerUsageLine", { n: tokens })
      : t("sessionOps.ledgerKindUsage")
  }
  if (entry.kind === "error") {
    return `${t("sessionOps.ledgerKindError")} · ${entry.detail ?? t("sessionOps.ledgerFailed")}`
  }
  const kind =
    entry.kind === "command" ? t("sessionOps.ledgerKindCommand") : t("sessionOps.ledgerKindTool")
  return selected ? `${kind} · ${t("sessionOps.ledgerOpenSources")}` : kind
}
