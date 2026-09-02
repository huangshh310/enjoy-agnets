/**
 * Composer 上方已钉入的知识芯片。
 */
import { useSyncExternalStore } from "react"
import {
  listSessionContextChips,
  subscribeSessionContextChips
} from "@renderer/hooks/session-context-chips"
import { ContextChipPill } from "../right-pane/views/context/context-chip-pill"

export function ComposerContextChips() {
  const chips = useSyncExternalStore(
    subscribeSessionContextChips,
    listSessionContextChips,
    listSessionContextChips
  )
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3.5 pb-1">
      {chips.map((chip) => (
        <ContextChipPill key={chip.id} chip={chip} />
      ))}
    </div>
  )
}
