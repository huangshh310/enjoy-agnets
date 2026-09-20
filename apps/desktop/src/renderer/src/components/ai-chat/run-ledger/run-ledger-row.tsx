/**
 * 账本一行：人话主行 + 目录次行。文件行开 sheet；命令默认只露摘要。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ledgerOpensSources } from "./format-ledger-entry"
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
  if (entry.kind === "usage") return <UsageRow entry={entry} />
  if (entry.kind === "command") {
    return <CommandRow entry={entry} selected={selected === true} onOpen={onOpen} />
  }
  return <FileRow entry={entry} selected={selected === true} onOpen={onOpen} />
}

function FileRow({
  entry,
  selected,
  onOpen
}: {
  entry: RunLedgerEntry
  selected: boolean
  onOpen: (entry: RunLedgerEntry) => void
}) {
  const t = useT()
  return (
    <button
      type="button"
      data-testid="run-ledger-row"
      data-kind={entry.kind}
      title={entry.path || entry.title}
      onClick={() => onOpen(entry)}
      className={cx(
        "flex w-full items-start justify-between gap-2 px-3 py-1.5 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "bg-accent-50 shadow-[inset_0_0_0_1px] shadow-accent-500/25"
          : "hover:bg-background-secondary-hover"
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-caption-1-medium text-text-primary">
          {filePrimary(entry, t)}
        </span>
        {entry.pathHint ? (
          <span className="mt-0.5 block truncate font-mono text-caption-2-regular text-text-tertiary">
            {entry.pathHint}
          </span>
        ) : null}
        {entry.kind === "error" && entry.detail ? (
          <span className="mt-0.5 block truncate text-caption-2-regular text-text-warning-primary">
            {entry.detail}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function CommandRow({
  entry,
  selected,
  onOpen
}: {
  entry: RunLedgerEntry
  selected: boolean
  onOpen: (entry: RunLedgerEntry) => void
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const opens = ledgerOpensSources(entry)
  const outcome = entry.failed ? t("sessionOps.ledgerCommandFail") : t("sessionOps.ledgerCommandOk")
  return (
    <div className={cx(selected && "bg-accent-50 shadow-[inset_0_0_0_1px] shadow-accent-500/25")}>
      <button
        type="button"
        data-testid="run-ledger-row"
        data-kind="command"
        title={entry.path || entry.title}
        onClick={() => {
          if (entry.output) setExpanded((open) => !open)
          if (opens) onOpen(entry)
        }}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className="min-w-0 truncate text-caption-1-regular text-text-primary">
          {entry.toolLabel ?? "bash"} · {entry.title} ·{" "}
          <span className={entry.failed ? "text-text-warning-primary" : "text-state-success-text"}>
            {outcome}
          </span>
        </span>
      </button>
      {expanded && entry.output ? (
        <pre
          data-testid="run-ledger-command-output"
          className="mx-3 mb-1.5 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background-secondary-default px-2 py-1 font-mono text-caption-2-regular text-text-tertiary"
        >
          {entry.output}
        </pre>
      ) : null}
    </div>
  )
}

function UsageRow({ entry }: { entry: RunLedgerEntry }) {
  const t = useT()
  const tokens = Number(entry.title)
  if (!Number.isFinite(tokens) || tokens <= 0) return null
  return (
    <div data-testid="run-ledger-row" data-kind="usage" className="px-3 py-1.5">
      <p className="text-caption-2-regular text-text-tertiary">{t("sessionOps.ledgerGroupUsage")}</p>
      <p className="text-caption-1-regular text-text-primary">
        {t("sessionOps.ledgerUsageTokens", { n: formatTokenCount(tokens) })}
      </p>
    </div>
  )
}

function filePrimary(
  entry: RunLedgerEntry,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  const name = entry.fileName || entry.title
  if (entry.kind === "edit") return `${t("sessionOps.ledgerVerbEdit")} · ${name}`
  if (entry.kind === "error") return `${t("sessionOps.ledgerVerbError")} · ${name}`
  return `${t("sessionOps.ledgerVerbRead")} · ${name}`
}

function formatTokenCount(n: number): string {
  if (n < 1000) return String(n)
  const k = n / 1000
  const compact = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")
  return `${compact}k`
}
