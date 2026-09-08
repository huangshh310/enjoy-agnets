/**
 * Chat 工作台：线程、composer、空态。始终挂载，切走模块时用 hidden 藏起。
 * 空会话与有消息同一拓扑：Header → flex-1 滚动内容 → shrink-0 Composer。
 * 禁止把 Composer 塞进 AiChatEmptyState children，禁止线程列 justify-center。
 * 禁止 SkillSourcePullStrip / 空会话技能源同步条；M6 更新只进 Skills 顶栏与设置默认项。
 */
import { Button } from "@/components/ui/button"
import { AiChatStatusBar } from "@renderer/components/ai-chat/ai-chat-status-bar"
import { AiChatThread } from "@renderer/components/ai-chat/ai-chat-thread"
import { ExperimentalMediaDialog } from "@renderer/components/ai-chat/experimental-media-dialog"
import { AiChatEmptyState } from "@renderer/components/ai-chat/empty-state/ai-chat-empty-state"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ChatComposerCluster } from "./chat-composer-cluster"
import { ChatStageHeader } from "./chat-stage-header"
import { useChatModelGate } from "./use-chat-model-gate"

export function ChatStage() {
  const t = useT()
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

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-card">
      {workspaceId ? (
        <ChatWorkspaceBody
          workspaceName={workspaceName}
          sessionTitle={sessionTitle}
          workspaceRootLabel={workspaceRootLabel}
          changesCount={changes.length}
          empty={messages.length === 0 && !running}
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
  rightPanelCollapsed: boolean
  onToggleRightPane: () => void
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const thinkingLabel = useChatStore((state) => state.thinkingLabel)
  const error = useChatStore((state) => state.error)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatStageHeader
        workspaceName={props.workspaceName}
        sessionTitle={props.sessionTitle}
        rightPanelCollapsed={props.rightPanelCollapsed}
        onToggleRightPane={props.onToggleRightPane}
      />
      {props.empty ? (
        <EmptySessionColumn
          workspaceName={props.workspaceName}
          sessionTitle={props.sessionTitle}
          workspaceRootLabel={props.workspaceRootLabel}
          changesCount={props.changesCount}
          onModelChange={props.onModelChange}
          onSend={props.onSend}
        />
      ) : (
        <>
          <AiChatThread
            messages={messages}
            running={running}
            thinkingLabel={thinkingLabel}
            error={error}
          />
          <ChatComposerCluster className="shrink-0" onModelChange={props.onModelChange} onSend={props.onSend} />
        </>
      )}
      <AiChatStatusBar workspaceRootLabel={props.workspaceRootLabel} />
    </div>
  )
}

/** Header 以下：guidance 单独滚动，Composer 钉底。禁止 justify-center / items-center / SkillSourcePullStrip。 */
function EmptySessionColumn(props: {
  workspaceName: string
  sessionTitle: string
  workspaceRootLabel: string
  changesCount: number
  onModelChange: (model: ModelOption) => void
  onSend: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AiChatEmptyState
          workspaceName={props.workspaceName}
          sessionTitle={props.sessionTitle}
          workspaceRootLabel={props.workspaceRootLabel}
          changesCount={props.changesCount}
        />
      </div>
      <ChatComposerCluster className="shrink-0" onModelChange={props.onModelChange} onSend={props.onSend} />
    </div>
  )
}
