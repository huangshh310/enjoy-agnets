/**
 * 会话内只读账本。按 kind 分组；点文件行打开同一张 P0-G「本轮来源」sheet。
 */
import { useMemo } from "react"
import { useT } from "@renderer/i18n"
import { collectTurnSources } from "../thread/sources/collect-turn-sources"
import { useChatStore } from "@renderer/stores/chat-store"
import { useHostInjectNames } from "@renderer/stores/host-inject/host-inject-store"
import { openSourcesSheet, useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { collectRunLedger, groupRunLedger, lastAssistantTurn } from "./collect-run-ledger"
import { ledgerOpensSources } from "./format-ledger-entry"
import { RunLedgerGroup } from "./run-ledger-group"
import { RunLedgerRow } from "./run-ledger-row"
import type { LedgerGroupKind, RunLedgerEntry } from "./run-ledger.types"

export function RunLedgerRail() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const assistant = lastAssistantTurn(messages)
  // 用量行只在有真实 token 时出现；本轮未存 usage.updated，不编造。
  const entries = useMemo(() => collectRunLedger(assistant), [assistant])
  const { groups, usage } = useMemo(() => groupRunLedger(entries), [entries])
  const ledgerId = useSourcesSheetStore((state) => state.ledgerEntry?.id ?? null)
  const sessionId = useChatStore((state) => state.sessionId)
  const hostInject = useHostInjectNames(sessionId, assistant?.id)
  const chips = assistant
    ? collectTurnSources({ ...assistant, hostInject }, (name) => t("chat.sourceSkillLabel", { name }))
    : []
  if (!assistant && entries.length === 0) return null

  return (
    <aside
      data-testid="run-ledger-rail"
      className="hidden w-[18.25rem] shrink-0 flex-col border-l border-separator-border bg-background-primary-default min-[1100px]:flex"
    >
      <header className="border-b border-separator-border px-3 py-2">
        <h3 className="text-caption-1-semibold text-text-primary">{t("sessionOps.ledgerTitle")}</h3>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("sessionOps.ledgerHint")}</p>
        <LedgerCountPills entries={entries} />
      </header>
      {entries.length === 0 ? (
        <p data-testid="run-ledger-empty" className="px-3 py-4 text-caption-1-regular text-text-primary">
          {t("sessionOps.ledgerEmpty")}
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {groups.map((group) => (
            <RunLedgerGroup
              key={group.kind}
              kind={group.kind}
              entries={group.entries}
              selectedId={ledgerId}
              onOpen={(row) => openLedgerSources(row, chips)}
            />
          ))}
          {usage ? <RunLedgerRow entry={usage} onOpen={() => undefined} /> : null}
        </div>
      )}
    </aside>
  )
}

function LedgerCountPills({ entries }: { entries: readonly RunLedgerEntry[] }) {
  const t = useT()
  const pills = (
    [
      ["read", "sessionOps.ledgerPillRead"],
      ["edit", "sessionOps.ledgerPillEdit"],
      ["command", "sessionOps.ledgerPillCommand"],
      ["error", "sessionOps.ledgerPillError"]
    ] as const
  ).flatMap(([kind, key]) => {
    const n = entries.filter((entry) => entry.kind === kind).length
    return n > 0 ? [{ kind, key, n }] : []
  })
  if (pills.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {pills.map((pill) => (
        <span
          key={pill.kind}
          className={cxPill(pill.kind)}
        >
          {t(pill.key, { n: pill.n })}
        </span>
      ))}
    </div>
  )
}

function cxPill(kind: LedgerGroupKind): string {
  const warn = kind === "error" ? " text-text-warning-primary" : " text-text-primary"
  return `rounded-full bg-background-secondary-default px-1.5 py-px text-caption-2-regular ring-1 ring-border-button-default${warn}`
}

function openLedgerSources(entry: RunLedgerEntry, chips: ReturnType<typeof collectTurnSources>): void {
  if (!ledgerOpensSources(entry)) return
  const activeId = entry.sourceChipId && chips.some((chip) => chip.id === entry.sourceChipId)
    ? entry.sourceChipId
    : (chips[0]?.id ?? null)
  openSourcesSheet({ chips, activeId, ledgerEntry: entry })
}
