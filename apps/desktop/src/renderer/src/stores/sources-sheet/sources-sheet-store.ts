/**
 * 「本轮来源」sheet 的唯一开闭口：芯片、验收闸、账本行共用。
 */
import { create } from "zustand"
import type { RunLedgerEntry } from "@renderer/components/ai-chat/run-ledger/run-ledger.types"
import type { TurnSourceChip } from "@renderer/components/ai-chat/thread/sources/source-chip"

export type OpenSourcesSheetInput = {
  chips: readonly TurnSourceChip[]
  activeId?: string | null
  ledgerEntry?: RunLedgerEntry | null
}

type SourcesSheetState = {
  open: boolean
  chips: TurnSourceChip[]
  activeId: string | null
  ledgerEntry: RunLedgerEntry | null
  openSheet: (input: OpenSourcesSheetInput) => void
  closeSheet: () => void
}

export const useSourcesSheetStore = create<SourcesSheetState>((set) => ({
  open: false,
  chips: [],
  activeId: null,
  ledgerEntry: null,
  openSheet: (input) =>
    set({
      open: true,
      chips: [...input.chips],
      activeId: input.activeId ?? null,
      ledgerEntry: input.ledgerEntry ?? null
    }),
  closeSheet: () => set({ open: false, ledgerEntry: null })
}))

export function openSourcesSheet(input: OpenSourcesSheetInput): void {
  useSourcesSheetStore.getState().openSheet(input)
}
