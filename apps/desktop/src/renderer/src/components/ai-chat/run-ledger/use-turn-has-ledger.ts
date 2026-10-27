/**
 * 顶栏「本轮账本」是否可开。工具行或本轮实测 token 都算；只报窗口不算。
 */
import { useSyncExternalStore } from "react"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { useChatStore } from "@renderer/stores/chat-store"
import {
  reportedTurnTokens,
  sessionUsageFor,
  sessionUsageVersion,
  subscribeSessionUsage
} from "@renderer/stores/session-usage"
import { lastAssistantTurn, ledgerUsageBag, turnHasLedger } from "./collect-run-ledger"

export function useTurnHasLedger(messages: readonly ThreadMessage[]): boolean {
  const sessionId = useChatStore((state) => state.sessionId)
  useSyncExternalStore(subscribeSessionUsage, sessionUsageVersion, sessionUsageVersion)
  const usage = sessionUsageFor(sessionId)
  const tokens = reportedTurnTokens(usage)
  return turnHasLedger(
    lastAssistantTurn(messages),
    ledgerUsageBag({ tokens, estimatedCost: usage?.estimatedCost })
  )
}
