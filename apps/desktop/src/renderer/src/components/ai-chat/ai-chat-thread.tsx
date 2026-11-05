"use client"

import { isComposerRailNotice } from "@renderer/components/ai-chat/composer/runtime-interact/composer-previous-preparing-rail"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Virtualizer, type VirtualizerHandle } from "virtua"
import { ThreadFindBar } from "./thread/thread-find/thread-find-bar"
import { useThreadFindOpen } from "./thread/thread-find/use-thread-find-hotkey"
import { TranscriptSelectionAction } from "./thread/transcript-selection-action"
import { LoadingState } from "@/components/ai-elements/loading-state"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationScrollOnChange,
  ConversationViewportStick,
  useStickToBottomContext
} from "@/components/ai-elements/conversation"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { useChatStore } from "@renderer/stores/chat-store"
import { DeferredThreadTurn } from "./thread/deferred-thread-turn"
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
import { useTurnHasLedger } from "./run-ledger/use-turn-has-ledger"
import { displayThinkingLabel } from "./thread/thinking-label"
import { lastUserMessageId, shouldScrollOnSend, takeSkipSendScroll, type SendScrollMark } from "./thread/scroll-on-send"
import { registerThreadVirtuaScroller } from "@renderer/lib/thread-virtua-scroll"
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
  const hasLedger = useTurnHasLedger(messages)
  const findOpen = useThreadFindOpen()
  const notice = useChatStore((state) => state.notice)
  const anchorId = noticeAnchorId(visible, notice)
  const sendTick = useSendScrollTick(sessionId, lastUserMessageId(visible))

  return (
    <div data-thread-root="" data-thread-virtua="true" className="relative flex min-h-6 min-w-0 flex-1 flex-col animate-in fade-in-50 duration-300">
      <ThreadFindBar open={findOpen} messages={visible} />
      <TranscriptSelectionAction />
      <Conversation className="min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden">
        {/* 矮窗收紧上下留白：滚到底时末尾的中断小卡整张露出、× 不被页头一侧裁掉（luna #146 P1）。
            turn 间距改由 virtua item padding 等价 gap-8 / 窄高 gap-2，Content 自身不再 gap。 */}
        <ConversationContent className="gap-0 px-8 py-6 pr-16 [@media(max-height:640px)]:py-1">
          <ThreadTurnVirtualList
            visible={visible}
            handoffCut={handoffCut}
            anchorId={anchorId}
          />
          {last && isLegacyHandoffTurn(last.createdAt, handoffCut) ? <HandoffLegacyDivider /> : null}

          {showPlaceholder ? <ThreadLoadingPlaceholder label={thinkingLabel} /> : null}
          <QueuedFollowups />

          {anchorId ? null : <ThreadNoticeBanner />}
          {error && !isComposerRailNotice(error) ? <ThreadErrorBanner error={error} /> : null}
          <div id="thread-turn-end" />
        </ConversationContent>
        <ConversationScrollButton />
        <ConversationViewportStick />
        {/* 最后一条用户消息换了就贴底（用户的各种发送都算，哪怕之前往上翻过）；只有排队自动发出 / 重来打了一次性「这次别滚」（host #170）。 */}
        <ConversationScrollOnChange trigger={sendTick} />
      </Conversation>
      <ThreadPreviewRail messages={visible} hasLedger={hasLedger} />
      <SubagentPill messages={visible} />
    </div>
  )
}

/** 同一会话里最后一条用户消息换了、且不是排队自动发出 / 重来，计数 +1；切会话只更新记号、不计数。 */
function useSendScrollTick(sessionId: string | null, lastUserId: string | null): number {
  const markRef = useRef<SendScrollMark>({ sessionId, lastUserId })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const next = { sessionId, lastUserId }
    if (shouldScrollOnSend(markRef.current, next, () => takeSkipSendScroll(sessionId))) setTick((value) => value + 1)
    markRef.current = next
  }, [sessionId, lastUserId])
  return tick
}

/**
 * 仅 ThreadTurnBlock 进 virtua；动态行高（不写死 itemSize）；scroll 容器仍喂 StickToBottom。
 * PermissionDock / QueuedFollowups / banner / #thread-turn-end 保持虚拟区外。
 */
function ThreadTurnVirtualList({
  visible,
  handoffCut,
  anchorId
}: {
  visible: ThreadMessage[]
  handoffCut: number | undefined
  anchorId: string | null
}) {
  const { scrollRef } = useStickToBottomContext()
  const virtuaRef = useRef<VirtualizerHandle>(null)
  const idToIndex = useMemo(() => {
    const map = new Map<string, number>()
    for (let index = 0; index < visible.length; index += 1) {
      const message = visible[index]
      if (message) map.set(message.id, index)
    }
    return map
  }, [visible])

  const keepMounted = useMemo(() => {
    const indexes: number[] = []
    for (let index = 0; index < visible.length; index += 1) {
      if (visible[index]?.streaming) indexes.push(index)
    }
    return indexes.length > 0 ? indexes : undefined
  }, [visible])

  useLayoutEffect(() => {
    registerThreadVirtuaScroller({
      scrollToMessageId(messageId) {
        const index = idToIndex.get(messageId)
        if (index == null || !virtuaRef.current) return false
        virtuaRef.current.scrollToIndex(index, { align: "center" })
        return true
      }
    })
    return () => registerThreadVirtuaScroller(null)
  }, [idToIndex])

  if (visible.length === 0) return null

  return (
    <Virtualizer
      ref={virtuaRef}
      scrollRef={scrollRef}
      data={visible}
      keepMounted={keepMounted}
    >
      {(message, index) => (
        <div
          key={message.id}
          data-thread-virtua-item={message.id}
          className="pb-8 [@media(max-height:640px)]:pb-2"
        >
          <ThreadTurnBlock
            message={message}
            previous={visible[index - 1]}
            cutAt={handoffCut}
            withNotice={message.id === anchorId}
            index={index}
            count={visible.length}
          />
        </div>
      )}
    </Virtualizer>
  )
}

function ThreadTurnBlock(props: {
  message: ThreadMessage
  previous?: ThreadMessage
  cutAt: number | undefined
  withNotice?: boolean
  index: number
  count: number
}) {
  const { message, previous, cutAt, withNotice, index, count } = props
  const showCut =
    previous != null &&
    isLegacyHandoffTurn(previous.createdAt, cutAt) &&
    !isLegacyHandoffTurn(message.createdAt, cutAt)
  const legacy = isLegacyHandoffTurn(message.createdAt, cutAt)
  const turn = message.role === "user" ? <UserTurn message={message} /> : <AssistantTurn message={message} />
  return (
    <DeferredThreadTurn
      messageId={message.id}
      index={index}
      count={count}
      streaming={Boolean(message.streaming)}
    >
      <div className={legacy ? "opacity-70" : undefined}>
        {showCut ? <HandoffLegacyDivider /> : null}
        {turn}
        {withNotice ? <ThreadNoticeBanner /> : null}
      </div>
    </DeferredThreadTurn>
  )
}

function ThreadLoadingPlaceholder({ label }: { label: string }) {
  const t = useT()
  const [startedAt] = useState(() => Date.now())
  return <LoadingState variant="drive" label={displayThinkingLabel(label, t)} startedAt={startedAt} />
}
