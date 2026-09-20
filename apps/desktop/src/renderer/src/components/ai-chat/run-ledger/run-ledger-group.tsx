/**
 * 账本组：自定义开合，不用浏览器默认 details。读/命令默认收起，改/错误默认展开。
 */
import { useState } from "react"
import { RiArrowRightSLine } from "@remixicon/react"
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
  const [open, setOpen] = useState(() => ledgerGroupDefaultOpen(kind))
  if (entries.length === 0) return null
  const failed = entries.filter((entry) => entry.failed).length
  return (
    <section data-testid="run-ledger-group" data-kind={kind} className="py-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className="flex w-full cursor-pointer items-center gap-1 px-3 py-1.5 text-left hover:bg-background-secondary-hover"
      >
        <RiArrowRightSLine
          aria-hidden
          className={cx(
            "size-3.5 shrink-0 text-text-tertiary transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="text-caption-2-medium text-text-tertiary">{groupLabel(kind, t)}</span>
        <span
          className={cx(
            "ml-auto font-mono text-caption-2-regular tabular-nums",
            kind === "error" || failed > 0 ? "text-text-warning-primary" : "text-text-tertiary"
          )}
        >
          {failed > 0 && kind === "command" ? `${failed}/${entries.length}` : entries.length}
        </span>
      </button>
      {open ? (
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
      ) : null}
    </section>
  )
}

function groupLabel(kind: LedgerGroupKind, t: (path: string) => string): string {
  if (kind === "edit") return t("sessionOps.ledgerGroupEdit")
  if (kind === "command") return t("sessionOps.ledgerGroupCommand")
  if (kind === "error") return t("sessionOps.ledgerGroupError")
  return t("sessionOps.ledgerGroupRead")
}
