/**
 * Chat 工作台：线程、composer、空态；`#/kanban` / `#/automations` 换表面不叠线程铬。
 * 有消息：Header → 线程 → shrink-0 Composer。
 * 空会话：Header → 居中开始面（问候 + Composer + pills）。Composer 不进 empty-state。
 * 禁止空会话技能源同步条；M6 更新只进 Skills 顶栏与设置默认项。
 */
import { QueuedFollowups } from "@renderer/components/ai-chat/thread/queued-followups"
import { sessionScopedCount, useSessionChanges } from "@renderer/hooks/session-changes"
import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRouterState } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { isComposerRailNotice } from "@renderer/components/ai-chat/composer/runtime-interact/composer-previous-preparing-rail"
import { useQuery } from "@tanstack/react-query"
import { AiChatStatusBar } from "@renderer/components/ai-chat/ai-chat-status-bar"
import { AiChatThread } from "@renderer/components/ai-chat/ai-chat-thread"
import { ExperimentalMediaDialog } from "@renderer/components/ai-chat/experimental-media-dialog"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import type { WorkspaceRow } from "@renderer/hooks/use-agent-session"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { reviewGatePhase } from "@renderer/components/ai-chat/review-gate/review-gate-phase"
import { RunLedgerRail } from "@renderer/components/ai-chat/run-ledger/run-ledger-rail"
import { collectRunLedger, lastAssistantTurn } from "@renderer/components/ai-chat/run-ledger/collect-run-ledger"
import { SourcesSheetHost } from "@renderer/stores/sources-sheet/sources-sheet-host"
import { EnvironmentPanel } from "@renderer/components/ai-chat/environment/environment-panel"
import { useEnvironmentDismiss } from "@renderer/components/ai-chat/environment/use-environment-dismiss"
import { ShortcutSheet } from "@renderer/components/ai-chat/shortcut-sheet"
import { ChatComposerCluster } from "./chat-composer-cluster"
import { PermissionDock } from "@renderer/components/ai-chat/attention/permission-dock"
import { KanbanBoard } from "@renderer/components/kanban/kanban-board"
import { AutomationsPage } from "@renderer/components/automations/automations-page"
import { AttentionNeedsBar } from "@renderer/components/ai-chat/attention/attention-strip"
import { ChatStageHeader } from "./chat-stage-header"
import { useTaskbarTitle } from "./use-taskbar-title"
import { EmptySessionStart } from "./empty-session-start"
import { EmptyStatePills } from "@renderer/components/ai-chat/empty-state/empty-state-pills"
import { focusComposerEnd } from "@renderer/components/ai-chat/empty-state/focus-composer"
import { NoProjectEmpty } from "./no-project-empty.tsx"
import { shouldShowNoProjectEmpty } from "./no-project-empty.ts"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatModelGate } from "./use-chat-model-gate"
import { usePermissionCycleHotkey } from "@renderer/components/ai-chat/use-permission-cycle-hotkey"
import {
  useThreadFindHotkey,
  useThreadFindOpen
} from "@renderer/components/ai-chat/thread/thread-find/use-thread-find-hotkey"
import { ThreadFindBar } from "@renderer/components/ai-chat/thread/thread-find/thread-find-bar"
import { queueComposerFocus } from "@renderer/hooks/composer-focus"
import { useSessionHistoryPending } from "@renderer/hooks/session-history-pending"

export function ChatStage() {
  usePermissionCycleHotkey()
  useThreadFindHotkey()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const sessionTitle = useChatStore((state) => state.sessionTitle)
  useTaskbarTitle(sessionTitle)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const changes = useChatStore((state) => state.changes)
  const rightPanelCollapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setRightPanelCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const gate = useChatModelGate()
  // luna P2：「N 项」按会话口径（跑前已脏、没被本会话改的不算；没写盘 run = 0）。
  const sessionChanges = useSessionChanges()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const surface = pathname === "/kanban" ? "kanban" : pathname === "/automations" ? "automations" : "thread"
  const workspaces = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })
  const historyPending = useSessionHistoryPending(sessionId, messages.length, running)
  const showNoProject = shouldShowNoProjectEmpty({
    workspaceId,
    surface,
    workspacesSettled: workspaces.isFetched || workspaces.isError,
    workspaceCount: workspaces.data?.length ?? 0
  })

  return (
    <main
      data-chat-stage="true"
      data-chat-surface={surface}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card"
    >
      <ShortcutSheet />
      {showNoProject ? (
        <NoProjectEmpty />
      ) : workspaceId || surface !== "thread" ? (
        <ChatWorkspaceBody
          workspaceName={workspaceName}
          sessionTitle={sessionTitle}
          workspaceRootLabel={workspaceRootLabel}
          changesCount={sessionScopedCount(sessionChanges, changes.length)}
          // 历史还在回灌时不判空：不先闪「在 xx 里做什么？」再跳成历史（luna main-155 重启）。
          empty={messages.length === 0 && !running && !historyPending}
          historyPending={historyPending}
          surface={surface}
          rightPanelCollapsed={rightPanelCollapsed}
          onToggleRightPane={() => {
            if (rightPanelCollapsed) expandInspector()
            else setRightPanelCollapsed(true)
          }}
          onModelChange={gate.requestModel}
          onSend={gate.requestSend}
        />
      ) : (
        <div className="flex flex-1 flex-col" data-testid="project-boot-wait" />
      )}
      <ExperimentalMediaDialog
        open={gate.promptOpen}
        onOpenChange={(open) => {
          if (!open) gate.cancel()
        }}
        onConfirm={() => void gate.confirm()}
      />
    </main>
  )
}

function ChatWorkspaceBody(props: {
  workspaceName: string
  sessionTitle: string
  workspaceRootLabel: string
  changesCount: number
  empty: boolean
  historyPending: boolean
  surface: "thread" | "kanban" | "automations"
  rightPanelCollapsed: boolean
  onToggleRightPane: () => void
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  if (props.surface === "kanban") return <KanbanBoard />
  if (props.surface === "automations") {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AutomationsPage />
      </div>
    )
  }
  const { surface: _surface, ...thread } = props
  return <ChatThreadBody {...thread} />
}

function ChatThreadBody(props: {
  workspaceName: string
  sessionTitle: string
  workspaceRootLabel: string
  changesCount: number
  empty: boolean
  historyPending: boolean
  rightPanelCollapsed: boolean
  onToggleRightPane: () => void
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const error = useChatStore((state) => state.error)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const workflowStatus = repositories.find((node) => node.id === sessionId)?.workflowStatus ?? null
  const reviewPhase = reviewGatePhase({ running, workflowStatus })
  const pendingApproval = useChatStore((state) => state.pendingApproval)
  const notice = useChatStore((state) => state.notice)
  // 空会话上段挂了红卡 / 提示卡：下段 pills 区不再与上段平分剩余高度，让问候标题留在可视区（luna main-155 patrol-21/22/51）。
  const emptyHasBanner = Boolean((error && !isComposerRailNotice(error)) || notice)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [environmentOpen, setEnvironmentOpen] = useState(false)
  const findOpen = useThreadFindOpen()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    if (pendingApproval) setEnvironmentOpen(false)
  }, [pendingApproval])
  useEnvironmentDismiss({
    open: environmentOpen,
    onClose: () => setEnvironmentOpen(false),
    sessionId,
    pathname,
    findOpen
  })
  useLayoutEffect(() => {
    queueComposerFocus()
  }, [sessionId, pathname])
  const assistant = lastAssistantTurn(messages)
  const hasLedger = useMemo(() => Boolean(assistant && collectRunLedger(assistant).length > 0), [assistant])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatStageHeader
        workspaceName={props.workspaceName}
        sessionTitle={props.sessionTitle}
        reviewPhase={reviewPhase}
        rightPanelCollapsed={props.rightPanelCollapsed}
        onToggleRightPane={props.onToggleRightPane}
        hasLedger={hasLedger}
        ledgerOpen={ledgerOpen}
        onToggleLedger={() => {
          setLedgerOpen((open) => {
            const next = !open
            if (next) setEnvironmentOpen(false)
            return next
          })
        }}
        environmentOpen={environmentOpen}
        onToggleEnvironment={() => {
          setEnvironmentOpen((open) => {
            const next = !open
            if (next) setLedgerOpen(false)
            return next
          })
        }}
      />
      <AttentionNeedsBar />
      <div
        className={
          props.empty
            ? // 空会话：问候 + 红卡在上段自己滚，Composer 永远整块露出（luna #150 733×480：还稿后第二行被压到底下）。
              "relative flex min-h-0 flex-1 flex-col overflow-hidden"
            : "relative flex min-h-0 flex-1 flex-col overflow-hidden [container-type:size]"
        }
      >
        {props.empty ? (
          // col-reverse：内容贴底（贴 Composer），放不下时滚动原点也在底部，红卡先露、问候往上滚。
          <div
            data-testid="empty-start-upper"
            className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-6 pt-8 [@media(max-height:560px)]:pt-3"
          >
            <div className="flex w-full flex-col items-center">
            <EmptySessionStart
              workspaceName={props.workspaceName}
              sessionTitle={props.sessionTitle}
              workspaceRootLabel={props.workspaceRootLabel}
              changesCount={props.changesCount}
            />
            <ThreadFindBar open={findOpen} messages={messages} />
            <EnvironmentPanel open={environmentOpen} />
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-14 min-w-0 flex-1 overflow-hidden">
            <div
              data-testid="chat-conversation"
              // 审批时对话列保底 13rem / 25% 主体（#144）；矮窗里消息区自身保 min-h-6（一行），不被卡挤成 0。
              // 审批卡上方挂着紧凑排队区时，那一行已经是「看得见的上下文」，消息区的 min-h-6 让出来给审批三钮（luna g158-42）。
              className={cx(
                "flex min-h-14 min-w-0 flex-1 flex-col",
                pendingApproval && "min-h-[min(13rem,25cqh)]",
                "[&:has(>[data-testid=queued-followups-docked])>[data-thread-root]]:min-h-0"
              )}
            >
              {props.historyPending ? (
                // 中性占位：保持空白，不画问候、不画示例；回灌完再出历史或空态。
                <div data-testid="thread-history-loading" aria-busy="true" className="min-h-6 flex-1" />
              ) : (
                <AiChatThread
                  messages={messages}
                  running={running}
                  thinkingLabel={thinkingLabel}
                  error={error}
                />
              )}
              {/* 有审批卡时排队项挂在审批卡正上方、不随消息滚，按钮不被页头挡、不和审批按钮叠（pr157-gate-52/53）。 */}
              <QueuedFollowups placement="dock" />
              <PermissionDock />
            </div>
            <EnvironmentPanel open={environmentOpen} />
            <RunLedgerRail open={ledgerOpen} onClose={() => setLedgerOpen(false)} />
            <SourcesSheetHost />
          </div>
        )}
        <ChatComposerCluster
          className={
            props.empty
              ? "mx-auto w-full max-w-3xl shrink-0 px-6"
              : pendingApproval
                ? "shrink-0"
                : "min-h-0 shrink"
          }
          composerClassName={
            props.empty ? "px-0 pb-2 [&_textarea]:min-h-[72px]" : pendingApproval ? "shrink-0" : "min-h-0"
          }
          autoFocus={props.empty}
          dock={props.empty}
          onModelChange={props.onModelChange}
          onSend={props.onSend}
        />
        {props.empty ? (
          <div
            data-testid="empty-start-lower"
            className={cx(
              "flex min-h-0 flex-col items-center justify-start overflow-hidden px-6 [@media(max-height:560px)]:hidden",
              emptyHasBanner ? "flex-none pt-1 pb-3" : "flex-1 pb-8"
            )}
          >
            <EmptyStatePills
              onSelectPrompt={(promptText) => {
                useChatStore.getState().setComposer(promptText)
                focusComposerEnd(promptText)
              }}
            />
          </div>
        ) : null}
      </div>
      <AiChatStatusBar workspaceRootLabel={props.workspaceRootLabel} />
    </div>
  )
}

