/**
 * Chat 舞台挂一张「本轮来源」sheet，芯片与账本行共用。
 */
import { SourceDetailSheet } from "@renderer/components/ai-chat/thread/sources/source-detail-sheet"
import { useSourcesSheetStore } from "./sources-sheet-store"

export function SourcesSheetHost() {
  const open = useSourcesSheetStore((state) => state.open)
  const chips = useSourcesSheetStore((state) => state.chips)
  const activeId = useSourcesSheetStore((state) => state.activeId)
  const ledgerEntry = useSourcesSheetStore((state) => state.ledgerEntry)
  const closeSheet = useSourcesSheetStore((state) => state.closeSheet)
  return (
    <SourceDetailSheet
      open={open}
      chips={chips}
      activeId={activeId}
      ledgerEntry={ledgerEntry}
      onClose={closeSheet}
    />
  )
}
