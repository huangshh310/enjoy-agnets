/**
 * 会话内只读账本。顶栏一句摘要；文件名优先；点带 path 的文件行开「本轮来源」。
 */
import { useMemo } from "react"
import { RiCloseLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { collectTurnSources } from "../thread/sources/collect-turn-sources"
import { useChatStore } from "@renderer/stores/chat-store"
import { useHostInjectNames } from "@renderer/stores/host-inject/host-inject-store"
import { openSourcesSheet, useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { collectRunLedger, groupRunLedger, lastAssistantTurn } from "./collect-run-ledger"
import { ledgerOpensSources } from "./format-ledger-entry"
import { RunLedgerGroup } from "./run-ledger-group"
import { RunLedgerRow } from "./run-ledger-row"
import { ledgerKindCounts, ledgerSummarySegments } from "./run-ledger-summary"
import type { RunLedgerEntry, RunLedgerGroup as LedgerGroup } from "./run-ledger.types"
import type { TurnSourceChip } from "../thread/sources/source-chip"

export function RunLedgerRail({
  open = true,
  onClose
}: {
  open?: boolean
  onClose?: () => void
} = {}) {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const assistant = lastAssistantTurn(messages)
  const entries = useMemo(() => collectRunLedger(assistant), [assistant])
  const { groups, usage } = useMemo(() => groupRunLedger(entries), [entries])
  const ledgerId = useSourcesSheetStore((state) => state.ledgerEntry?.id ?? null)
  const sessionId = useChatStore((state) => state.sessionId)
  const hostInject = useHostInjectNames(sessionId, assistant?.id)
  const chips = assistant
    ? collectTurnSources({ ...assistant, hostInject }, (name) => t("chat.sourceSkillLabel", { name }))
    : []
  if (!open || (!assistant && entries.length === 0)) return null

  return (
    <aside
      data-testid="run-ledger-rail"
      className="hidden w-[18.25rem] shrink-0 flex-col border-l border-separator-border bg-background-primary-default min-[1100px]:flex"
    >
      <LedgerRailHeader
        onClose={onClose}
        segments={ledgerSummarySegments(ledgerKindCounts(entries), t)}
        join={t("sessionOps.ledgerSummaryJoin")}
      />
      {entries.length === 0 ? (
        <p data-testid="run-ledger-empty" className="px-3 py-4 text-caption-1-regular text-text-tertiary">
          {t("sessionOps.ledgerEmpty")}
        </p>
      ) : (
        <LedgerRailBody
          groups={groups}
          usage={usage}
          selectedId={ledgerId}
          onOpen={(row) => openLedgerSources(row, chips)}
        />
      )}
    </aside>
  )
}

function LedgerRailHeader({
  onClose,
  segments,
  join
}: {
  onClose?: () => void
  segments: Array<{ text: string; warn?: boolean }>
  join: string
}) {
  const t = useT()
  return (
    <header className="border-b border-separator-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-caption-1-semibold text-text-primary">{t("sessionOps.ledgerTitle")}</h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-5 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
            aria-label={t("sessionOps.ledgerClose")}
          >
            <RiCloseLine className="size-3.5" />
          </button>
        ) : null}
      </div>
      {segments.length > 0 ? <LedgerSummaryLine segments={segments} join={join} /> : null}
    </header>
  )
}

function LedgerRailBody({
  groups,
  usage,
  selectedId,
  onOpen
}: {
  groups: LedgerGroup[]
  usage: RunLedgerEntry | null
  selectedId: string | null
  onOpen: (entry: RunLedgerEntry) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {groups.map((group) => (
          <RunLedgerGroup
            key={group.kind}
            kind={group.kind}
            entries={group.entries}
            selectedId={selectedId}
            onOpen={onOpen}
          />
        ))}
      </div>
      {usage ? (
        <div className="border-t border-separator-border">
          <RunLedgerRow entry={usage} onOpen={() => undefined} />
        </div>
      ) : null}
    </div>
  )
}

function LedgerSummaryLine({
  segments,
  join
}: {
  segments: Array<{ text: string; warn?: boolean }>
  join: string
}) {
  return (
    <p className="mt-1 text-caption-2-regular text-text-tertiary">
      {segments.map((segment, index) => (
        <span key={segment.text}>
          {index > 0 ? join : null}
          <span className={segment.warn ? "text-status-yellow-text" : undefined}>{segment.text}</span>
        </span>
      ))}
    </p>
  )
}

function openLedgerSources(entry: RunLedgerEntry, chips: TurnSourceChip[]): void {
  if (!ledgerOpensSources(entry)) return
  const withFile = ensureFileChip(entry, chips)
  if (withFile.length === 0) return
  const activeId = entry.sourceChipId && withFile.some((chip) => chip.id === entry.sourceChipId)
    ? entry.sourceChipId
    : (withFile[0]?.id ?? null)
  openSourcesSheet({ chips: withFile, activeId, ledgerEntry: entry })
}

function ensureFileChip(entry: RunLedgerEntry, chips: TurnSourceChip[]): TurnSourceChip[] {
  const path = entry.path?.trim()
  if (!path) return chips
  if (chips.some((chip) => chip.path === path || chip.id === `file:${path}`)) return chips
  const name = entry.fileName || entry.title
  return [
    ...chips,
    { id: `file:${path}`, kind: "file", label: name, path, title: name }
  ]
}
