/**
 * 会话内只读账本。点行打开同一张 P0-G「本轮来源」sheet。
 */
import { useMemo } from "react"
import { useT } from "@renderer/i18n"
import { collectTurnSources } from "../thread/sources/collect-turn-sources"
import { useChatStore } from "@renderer/stores/chat-store"
import { openSourcesSheet, useSourcesSheetStore } from "@renderer/stores/sources-sheet/sources-sheet-store"
import { collectRunLedger, lastAssistantTurn } from "./collect-run-ledger"
import { RunLedgerRow } from "./run-ledger-row"
import type { RunLedgerEntry } from "./run-ledger.types"

export function RunLedgerRail() {
  const t = useT()
  const messages = useChatStore((state) => state.messages)
  const assistant = lastAssistantTurn(messages)
  // 用量行只在有真实 token 时出现；本轮未存 usage.updated，不编造。
  const entries = useMemo(() => collectRunLedger(assistant), [assistant])
  const ledgerId = useSourcesSheetStore((state) => state.ledgerEntry?.id ?? null)
  if (entries.length === 0) return null

  const chips = assistant
    ? collectTurnSources(assistant, (name) => t("chat.sourceSkillLabel", { name }))
    : []

  return (
    <aside
      data-testid="run-ledger-rail"
      className="hidden w-[15.5rem] shrink-0 flex-col border-l border-separator-border bg-background-primary-default min-[1100px]:flex"
    >
      <header className="border-b border-separator-border px-3 py-2">
        <h3 className="text-caption-1-semibold text-text-primary">{t("sessionOps.ledgerTitle")}</h3>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("sessionOps.ledgerHint")}</p>
      </header>
      <ol className="min-h-0 flex-1 divide-y divide-separator-border overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id}>
            <RunLedgerRow
              entry={entry}
              selected={ledgerId === entry.id}
              onOpen={(row) => openLedgerSources(row, chips)}
            />
          </li>
        ))}
      </ol>
    </aside>
  )
}

function openLedgerSources(entry: RunLedgerEntry, chips: ReturnType<typeof collectTurnSources>): void {
  const activeId = entry.sourceChipId && chips.some((chip) => chip.id === entry.sourceChipId)
    ? entry.sourceChipId
    : (chips[0]?.id ?? null)
  openSourcesSheet({ chips, activeId, ledgerEntry: entry })
}
