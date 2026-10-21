"use client"

import { isComposerRailNotice } from "@renderer/components/ai-chat/composer/runtime-interact/composer-previous-preparing-rail"
import { useEffect, useRef, useState } from "react"
import { ThreadFindBar } from "./thread/thread-find/thread-find-bar"
import { useThreadFindOpen } from "./thread/thread-find/use-thread-find-hotkey"
import { TranscriptSelectionAction } from "./thread/transcript-selection-action"
import { LoadingState } from "@/components/ai-elements/loading-state"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationScrollOnChange,
  ConversationViewportStick
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
import { noticeAnchorId } from "./thread/notice-anchor"
import { ThreadPreviewRail } from "./thread/thread-preview-rail"
import { SubagentPill } from "./thread/subagent-pill/subagent-pill"
import { collectRunLedger, lastAssistantTurn } from "./run-ledger/collect-run-ledger"
import { displayThinkingLabel } from "./thread/thinking-label"
import { lastUserMessageId, shouldScrollOnSend, takeUserSend, type SendScrollMark } from "./thread/scroll-on-send"
import { useT } from "@renderer/i18n"

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
  const notice = useChatStore((state) => state.notice)
  const anchorId = noticeAnchorId(visible, notice)
  const sendTick = useSendScrollTick(sessionId, lastUserMessageId(visible))

  return (
    <div data-thread-root="" className="relative flex min-h-6 min-w-0 flex-1 flex-col animate-in fade-in-50 duration-300">
      <ThreadFindBar open={findOpen} messages={visible} />
      <TranscriptSelectionAction />
      <Conversation className="min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden">
        {/* 矮窗收紧上下留白：滚到底时末尾的中断小卡整张露出、× 不被页头一侧裁掉（luna #146 P1）。 */}
        <ConversationContent className="gap-8 px-8 py-6 pr-16 [@media(max-height:640px)]:gap-2 [@media(max-height:640px)]:py-1">
          {visible.map((message, index) => (
            <ThreadTurnBlock
              key={message.id}
              message={message}
              previous={visible[index - 1]}
              cutAt={handoffCut}
              withNotice={message.id === anchorId}
            />
          ))}
          {last && isLegacyHandoffTurn(last.createdAt, handoffCut) ? <HandoffLegacyDivider /> : null}

          {showPlaceholder ? <ThreadLoadingPlaceholder label={thinkingLabel} /> : null}
          <QueuedFollowups />

          {anchorId ? null : <ThreadNoticeBanner />}
          {error && !isComposerRailNotice(error) ? <ThreadErrorBanner error={error} /> : null}
          <div id="thread-turn-end" />
        </ConversationContent>
        <ConversationScrollButton />
        <ConversationViewportStick />
        {/* 用户自己点了发送、最后一条用户消息换了才贴底，哪怕之前往上翻过；排队自动发出 / 重来不拽（mike P3，leo soft-2）。 */}
        <ConversationScrollOnChange trigger={sendTick} />
      </Conversation>
      <ThreadPreviewRail messages={visible} hasLedger={hasLedger} />
      <SubagentPill messages={visible} />
    </div>
  )
}

/** 同一会话里最后一条用户消息换了、且是用户自己点的发送，计数 +1；切会话只更新记号、不计数。 */
function useSendScrollTick(sessionId: string | null, lastUserId: string | null): number {
  const markRef = useRef<SendScrollMark>({ sessionId, lastUserId })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const next = { sessionId, lastUserId }
    if (shouldScrollOnSend(markRef.current, next, () => takeUserSend(sessionId))) setTick((value) => value + 1)
    markRef.current = next
  }, [sessionId, lastUserId])
  return tick
}

function ThreadTurnBlock(props: {
  message: ThreadMessage
  previous?: ThreadMessage
  cutAt: number | undefined
  withNotice?: boolean
}) {
  const { message, previous, cutAt, withNotice } = props
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
      {withNotice ? <ThreadNoticeBanner /> : null}
    </div>
  )
}

function ThreadLoadingPlaceholder({ label }: { label: string }) {
  const t = useT()
  const [startedAt] = useState(() => Date.now())
  return <LoadingState variant="drive" label={displayThinkingLabel(label, t)} startedAt={startedAt} />
}
