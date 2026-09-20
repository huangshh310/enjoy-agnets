/**
 * 账本按 kind 折叠组。读/命令默认收起；改/错误默认展开。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ledgerGroupDefaultOpen } from "./format-ledger-entry"
import { RunLedgerRow } from "./run-ledger-row"
import type { LedgerGroupKind, RunLedgerEntry } from "./run-ledger.types"

export function RunLedgerGroup({
  kind,
  entries,
  selectedId,
  onOpen
}: {
  kind: LedgerGroupKind
  entries: readonly RunLedgerEntry[]
  selectedId: string | null
  onOpen: (entry: RunLedgerEntry) => void
}) {
  const t = useT()
  if (entries.length === 0) return null
  return (
    <details
      data-testid="run-ledger-group"
      data-kind={kind}
      open={ledgerGroupDefaultOpen(kind)}
      className="group"
    >
      <summary
        className={cx(
          "flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-caption-1-semibold text-text-primary",
          "hover:bg-background-secondary-hover"
        )}
      >
        <span
          aria-hidden="true"
          className="inline-block text-caption-2-regular text-text-tertiary transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        {groupLabel(kind, t)} · {entries.length}
      </summary>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <RunLedgerRow
              entry={entry}
              selected={selectedId === entry.id}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>
    </details>
  )
}

function groupLabel(
  kind: LedgerGroupKind,
  t: (path: string) => string
): string {
  if (kind === "edit") return t("sessionOps.ledgerGroupEdit")
  if (kind === "command") return t("sessionOps.ledgerGroupCommand")
  if (kind === "error") return t("sessionOps.ledgerGroupError")
  return t("sessionOps.ledgerGroupRead")
}
