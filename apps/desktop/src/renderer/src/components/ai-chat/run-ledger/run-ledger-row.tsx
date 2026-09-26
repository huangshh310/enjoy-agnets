/**
 * 账本一行：文件名 + 类型标；命令是 $ 摘要。组头已经标明读/改，行上不再重复动词。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { FileTypeIcon } from "@renderer/components/ai-chat/file-type-icon"
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
  const name = entry.fileName || entry.title
  const opens = ledgerOpensSources(entry)
  return (
    <button
      type="button"
      data-testid="run-ledger-row"
      data-kind={entry.kind}
      title={entry.path || name}
      onClick={() => {
        if (opens) onOpen(entry)
      }}
      className={cx(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        selected
          ? "bg-accent-50"
          : "hover:bg-background-secondary-hover"
      )}
    >
      <FileTypeIcon name={name} size={14} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-caption-1-medium text-text-primary">{name}</span>
        {entry.pathHint ? (
          <span className="mt-px block truncate font-mono text-caption-2-regular text-text-tertiary">
            {entry.pathHint}
          </span>
        ) : null}
        {entry.kind === "error" && entry.detail ? (
          <span className="mt-px block truncate text-caption-2-regular text-status-yellow-text">
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
    <div className={cx(selected && "bg-accent-50")}>
      <button
        type="button"
        data-testid="run-ledger-row"
        data-kind="command"
        title={entry.title}
        onClick={() => {
          if (entry.output) setExpanded((open) => !open)
          if (opens) onOpen(entry)
        }}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className="shrink-0 font-mono text-caption-2-regular text-text-tertiary">$</span>
        <span className="min-w-0 flex-1 truncate font-mono text-caption-1-regular text-text-primary">
          {entry.title}
        </span>
        <span
          className={cx(
            "shrink-0 text-caption-2-regular",
            entry.failed ? "text-status-yellow-text" : "text-state-success-text"
          )}
        >
          {outcome}
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
    <div data-testid="run-ledger-row" data-kind="usage" className="px-3 py-2">
      <p className="font-mono text-caption-2-regular tabular-nums text-text-tertiary">
        {t("sessionOps.ledgerUsageTokens", { n: formatTokenCount(tokens) })}
      </p>
    </div>
  )
}

function formatTokenCount(n: number): string {
  if (n < 1000) return String(n)
  const k = n / 1000
  const compact = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")
  return `${compact}k`
}
