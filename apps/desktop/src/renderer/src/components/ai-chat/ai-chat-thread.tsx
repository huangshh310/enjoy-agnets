"use client"

import { useState } from "react"
import { ThreadFindBar } from "./thread/thread-find/thread-find-bar"
import { useThreadFindOpen } from "./thread/thread-find/use-thread-find-hotkey"
import { TranscriptSelectionAction } from "./thread/transcript-selection-action"
import { LoadingState } from "@/components/ai-elements/loading-state"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { AssistantTurn } from "./thread/turns/assistant-turn"
import { UserTurn } from "./thread/turns/user-turn"
import { visibleThreadMessages } from "./thread/orphan-extract-turn"
import { HandoffLegacyDivider, isLegacyHandoffTurn } from "./thread/handoff-legacy-divider"
import { QueuedFollowups } from "./thread/queued-followups"
import { ThreadErrorBanner } from "./thread/thread-error-banner"
import { ThreadNoticeBanner } from "./thread/thread-notice-banner"
import { ThreadPreviewRail } from "./thread/thread-preview-rail"
import { SubagentPill } from "./thread/subagent-pill/subagent-pill"
import { collectRunLedger, lastAssistantTurn } from "./run-ledger/collect-run-ledger"

export function AiChatThread({
  messages,
  running,
  thinkingLabel,
  error
}: {
  messages: ThreadMessage[]
  running: boolean
  thinkingLabel: string
  error: string | null
}) {
  const pendingApproval = useChatStore((state) => state.pendingApproval)
  const sessionId = useChatStore((state) => state.sessionId)
  const handoffCut = useChatStore((state) =>
    sessionId ? state.sessionHandoffCuts[sessionId] : undefined
  )
  const visible = visibleThreadMessages(messages)
  const last = visible.at(-1)
  const showPlaceholder = running && !pendingApproval && last?.role !== "assistant"
  const assistant = lastAssistantTurn(messages)
  const hasLedger = Boolean(assistant && collectRunLedger(assistant).length > 0)
  const findOpen = useThreadFindOpen()

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col animate-in fade-in-50 duration-300">
      <ThreadFindBar open={findOpen} messages={visible} />
      <TranscriptSelectionAction />
      <Conversation className="min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden">
        <ConversationContent className="gap-8 px-8 py-6 pr-16">
          {visible.map((message, index) => (
            <ThreadTurnBlock
              key={message.id}
              message={message}
              previous={visible[index - 1]}
              cutAt={handoffCut}
            />
          ))}
          {last && isLegacyHandoffTurn(last.createdAt, handoffCut) ? <HandoffLegacyDivider /> : null}

          {showPlaceholder ? <ThreadLoadingPlaceholder label={thinkingLabel} /> : null}
          <QueuedFollowups />

          <ThreadNoticeBanner />
          {error ? <ThreadErrorBanner error={error} /> : null}
          <div id="thread-turn-end" />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <ThreadPreviewRail messages={visible} hasLedger={hasLedger} />
      <SubagentPill messages={visible} />
    </div>
  )
}

function ThreadTurnBlock(props: {
  message: ThreadMessage
  previous?: ThreadMessage
  cutAt: number | undefined
}) {
  const { message, previous, cutAt } = props
  const showCut =
    previous != null &&
    isLegacyHandoffTurn(previous.createdAt, cutAt) &&
    !isLegacyHandoffTurn(message.createdAt, cutAt)
  const legacy = isLegacyHandoffTurn(message.createdAt, cutAt)
  const turn =
    message.role === "user" ? (
      <UserTurn message={message} />
    ) : (
      <AssistantTurn message={message} />
    )
  return (
    <div className={legacy ? "opacity-70" : undefined}>
      {showCut ? <HandoffLegacyDivider /> : null}
      {turn}
    </div>
  )
}

function ThreadLoadingPlaceholder({ label }: { label: string }) {
  const [startedAt] = useState(() => Date.now())
  return <LoadingState variant="drive" label={label} startedAt={startedAt} />
}
