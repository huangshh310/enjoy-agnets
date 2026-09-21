/**
 * Chat 工作台：线程、composer、空态；`#/kanban` / `#/automations` 换表面不叠线程铬。
 * 有消息：Header → 线程 → shrink-0 Composer。
 * 空会话：Header → 居中开始面（问候 + Composer + pills）。Composer 不进 empty-state。
 * 禁止空会话技能源同步条；M6 更新只进 Skills 顶栏与设置默认项。
 */
import { useMemo, useState } from "react"
import { useRouterState } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { Button } from "@/components/ui/button"
import { AiChatStatusBar } from "@renderer/components/ai-chat/ai-chat-status-bar"
import { AiChatThread } from "@renderer/components/ai-chat/ai-chat-thread"
import { ExperimentalMediaDialog } from "@renderer/components/ai-chat/experimental-media-dialog"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { reviewGatePhase } from "@renderer/components/ai-chat/review-gate/review-gate-phase"
import { RunLedgerRail } from "@renderer/components/ai-chat/run-ledger/run-ledger-rail"
import { collectRunLedger, lastAssistantTurn } from "@renderer/components/ai-chat/run-ledger/collect-run-ledger"
import { SourcesSheetHost } from "@renderer/stores/sources-sheet/sources-sheet-host"
import { EnvironmentPanel } from "@renderer/components/ai-chat/environment/environment-panel"
import { ChatComposerCluster } from "./chat-composer-cluster"
import { KanbanBoard } from "@renderer/components/kanban/kanban-board"
import { AutomationsPage } from "@renderer/components/automations/automations-page"
import { ChatStageHeader } from "./chat-stage-header"
import { EmptySessionStart } from "./empty-session-start"
import { useChatModelGate } from "./use-chat-model-gate"
import { usePermissionCycleHotkey } from "@renderer/components/ai-chat/use-permission-cycle-hotkey"
import {
  useThreadFindHotkey,
  useThreadFindOpen
} from "@renderer/components/ai-chat/thread/thread-find/use-thread-find-hotkey"
import { ThreadFindBar } from "@renderer/components/ai-chat/thread/thread-find/thread-find-bar"

export function ChatStage() {
  const t = useT()
  usePermissionCycleHotkey()
  useThreadFindHotkey()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const sessionTitle = useChatStore((state) => state.sessionTitle)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const changes = useChatStore((state) => state.changes)
  const rightPanelCollapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setRightPanelCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const gate = useChatModelGate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const surface = pathname === "/kanban" ? "kanban" : pathname === "/automations" ? "automations" : "thread"

  return (
    <main
      data-chat-stage="true"
      data-chat-surface={surface}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card"
    >
      {workspaceId || surface !== "thread" ? (
        <ChatWorkspaceBody
          workspaceName={workspaceName}
          sessionTitle={sessionTitle}
          workspaceRootLabel={workspaceRootLabel}
          changesCount={changes.length}
          empty={messages.length === 0 && !running}
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-title-3-semibold text-text-primary">{t("chat.openWorkspace")}</p>
          <p className="max-w-sm text-body-medium text-text-secondary">{t("chat.openWorkspaceHint")}</p>
          <Button onClick={() => void openFolder()}>{t("chat.openFolder")}</Button>
        </div>
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
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [environmentOpen, setEnvironmentOpen] = useState(true)
  const findOpen = useThreadFindOpen()
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
      {props.empty ? (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EmptySessionStart
            workspaceName={props.workspaceName}
            sessionTitle={props.sessionTitle}
            workspaceRootLabel={props.workspaceRootLabel}
            changesCount={props.changesCount}
            onModelChange={props.onModelChange}
            onSend={props.onSend}
          />
          <ThreadFindBar open={findOpen} messages={messages} />
          <EnvironmentPanel open={environmentOpen} />
        </div>
      ) : (
        <>
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className={cx(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                environmentOpen && "min-[900px]:pr-[18.75rem]"
              )}
            >
              <AiChatThread
                messages={messages}
                running={running}
                thinkingLabel={thinkingLabel}
                error={error}
              />
            </div>
            <EnvironmentPanel open={environmentOpen} />
            <RunLedgerRail open={ledgerOpen} onClose={() => setLedgerOpen(false)} />
          </div>
          <SourcesSheetHost />
          <ChatComposerCluster className="shrink-0" onModelChange={props.onModelChange} onSend={props.onSend} />
        </>
      )}
      <AiChatStatusBar workspaceRootLabel={props.workspaceRootLabel} />
    </div>
  )
}

