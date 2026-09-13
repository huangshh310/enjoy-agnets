/**
 * 工作台 + Inspector 分栏。Chat 与其它模块共用，Chat 用 hidden 保活。
 * 工作台 Panel 不可 collapse：审查栏加宽最多压到 42%，切模块拉回 62%。
 */
import { useEffect } from "react"
import { Outlet } from "@tanstack/react-router"
import { Group, Panel, useDefaultLayout } from "react-resizable-panels"
import { cx } from "@/utils/cx"
import { useRightPaneShortcuts } from "@renderer/components/ai-chat/right-pane/use-right-pane-shortcuts"
import { useRightPaneWidth } from "@renderer/components/ai-chat/right-pane/use-right-pane-width"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AppModuleId } from "../app-shell.types"
import { AttentionStrip } from "@renderer/components/ai-chat/attention/attention-strip"
import { ChatStage } from "../chat/chat-stage"
import { InspectorPane } from "./inspector-pane"
import { sanitizeSplitLayout, STAGE_DEFAULT_SIZE, STAGE_MIN_PERCENT } from "./inspector-panel-size"

export function StageSplit({
  isChat,
  activeModule
}: {
  isChat: boolean
  activeModule: AppModuleId
}) {
  const rightPanelCollapsed = useChatStore((state) => state.rightPanelCollapsed)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
  })
  useRightPaneShortcuts()
  const { groupRef, chatPanelRef, maximized, toggleWidth, resetWidth, restoreStage } =
    useRightPaneWidth()

  useEffect(() => {
    restoreStage()
  }, [activeModule, restoreStage])

  const splitLayout =
    defaultLayout && typeof defaultLayout === "object"
      ? sanitizeSplitLayout(defaultLayout as Record<string, number>)
      : defaultLayout

  return (
    <Group
      id="enjoy-agents-chat-split"
      orientation="horizontal"
      className="h-full min-h-0 min-w-0 flex-1"
      groupRef={groupRef}
      defaultLayout={splitLayout}
      onLayoutChanged={(layout, meta) => {
        if (maximized || rightPanelCollapsed || Object.keys(layout).length < 2) return
        const inspectorPercent = layout.changes
        if (typeof inspectorPercent === "number" && inspectorPercent < 10) return
        const chatPercent = layout.chat
        if (typeof chatPercent === "number" && chatPercent < STAGE_MIN_PERCENT) return
        onLayoutChanged(layout, meta)
      }}
    >
      <Panel
        id="chat"
        panelRef={chatPanelRef}
        minSize="360px"
        defaultSize={STAGE_DEFAULT_SIZE}
        className="h-full min-h-0 overflow-hidden bg-transparent"
      >
        <div className="flex h-full min-h-0 flex-col">
          <AttentionStrip />
          <div className="relative min-h-0 flex-1">
            <div className={cx("absolute inset-0 flex min-h-0 flex-col", !isChat && "hidden")}>
              <ChatStage />
            </div>
            <div className={cx("absolute inset-0 flex min-h-0 flex-col", isChat && "hidden")}>
              <Outlet />
            </div>
          </div>
        </div>
      </Panel>
      <InspectorPane maximized={maximized} toggleWidth={toggleWidth} resetWidth={resetWidth} />
    </Group>
  )
}
