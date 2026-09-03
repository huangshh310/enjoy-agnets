/**
 * 原始载荷视图状态：inspectPrompt 查询、搜索、复制、折叠。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { AgentMode, InspectPromptResult } from "@enjoy-agents/ipc-contract"
import { formatContextChipsForSend, type SessionContextChip } from "@renderer/hooks/session-context-chips"
import { useChatStore } from "@renderer/stores/chat-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { inspectToRawMessages, type RawThreadMessage } from "./raw-thread-messages.ts"

export function useRawPromptView({
  sessionId,
  mode,
  modelId,
  chips
}: {
  sessionId: string | null
  mode: AgentMode
  modelId: string
  chips: SessionContextChip[]
}) {
  const [copiedFull, setCopiedFull] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(() => new Set([0, 1]))
  const inspectQuery = useQuery({
    queryKey: ["inspect-prompt", sessionId, mode, modelId],
    enabled: hasIde() && Boolean(sessionId),
    queryFn: () =>
      getIde().agent.inspectPrompt({ sessionId, mode, modelId }) as Promise<InspectPromptResult>
  })
  const running = useChatStore((state) => state.running)
  const prevRunning = useRef(running)

  useEffect(() => {
    if (prevRunning.current && !running) {
      void inspectQuery.refetch()
    }
    prevRunning.current = running
  }, [running, inspectQuery])

  const payload = inspectQuery.data
  const rawMessages = useMemo(
    () => (payload ? inspectToRawMessages(payload.instructions, payload.messages) : []),
    [payload]
  )
  const queuedContext = formatContextChipsForSend(chips)
  const filteredMessages = useMemo(() => filterRaw(rawMessages, searchQuery), [rawMessages, searchQuery])
  const totalTokens = rawMessages.reduce((sum, message) => sum + message.tokens, 0)
  const fullJsonString = useMemo(() => JSON.stringify(payload ?? {}, null, 2), [payload])

  return {
    payload,
    queuedContext,
    filteredMessages,
    totalTokens,
    messageCount: rawMessages.length,
    fullJsonString,
    copiedFull,
    copiedIdx,
    searchQuery,
    setSearchQuery,
    expandedIndices,
    setCopiedFull,
    setCopiedIdx,
    toggleExpand: (index: number) => {
      setExpandedIndices((prev) => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return next
      })
    }
  }
}

function filterRaw(messages: RawThreadMessage[], searchQuery: string): RawThreadMessage[] {
  if (!searchQuery.trim()) return messages
  const query = searchQuery.toLowerCase()
  return messages.filter((message) => message.rawText.toLowerCase().includes(query))
}
