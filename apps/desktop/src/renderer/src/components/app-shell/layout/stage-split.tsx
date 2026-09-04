/**
 * 工作台 + Inspector 分栏。Chat 与其它模块共用，Chat 用 hidden 保活。
 */
import { RiLayoutRight2Line } from "@remixicon/react"
import { Outlet } from "@tanstack/react-router"
import { Group, Panel, useDefaultLayout } from "react-resizable-panels"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { cx } from "@/utils/cx"
import { useRightPaneShortcuts } from "@renderer/components/ai-chat/right-pane/use-right-pane-shortcuts"
import { useRightPaneWidth } from "@renderer/components/ai-chat/right-pane/use-right-pane-width"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { ChatStage } from "../chat/chat-stage"
import { InspectorPane } from "./inspector-pane"

export function StageSplit({ isChat }: { isChat: boolean }) {
  const t = useT()
  const rightPanelCollapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setRightPanelCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "enjoy-agents-chat-split",
    storage: window.localStorage
  })
  useRightPaneShortcuts()
  const { groupRef, chatPanelRef, maximized, toggleWidth, resetWidth } = useRightPaneWidth()

  return (
    <Group
      id="enjoy-agents-chat-split"
      orientation="horizontal"
      className="h-full min-h-0 min-w-0 flex-1"
      groupRef={groupRef}
      defaultLayout={defaultLayout}
      onLayoutChanged={(layout, meta) => {
        if (maximized || rightPanelCollapsed || Object.keys(layout).length < 2) return
        const inspectorPercent = layout.changes
        if (typeof inspectorPercent === "number" && inspectorPercent < 10) return
        onLayoutChanged(layout, meta)
      }}
    >
      <Panel
        id="chat"
        panelRef={chatPanelRef}
        collapsible
        collapsedSize="0px"
        minSize="360px"
        defaultSize="62%"
        className="h-full min-h-0 overflow-hidden bg-transparent"
      >
        <div className="relative h-full min-h-0">
          <div className={cx("absolute inset-0 flex min-h-0 flex-col", !isChat && "hidden")}>
            <ChatStage />
          </div>
          <div className={cx("absolute inset-0 flex min-h-0 flex-col", isChat && "hidden")}>
            <Outlet />
          </div>
          {rightPanelCollapsed && !isChat ? (
            <QuietIconButton
              icon={RiLayoutRight2Line}
              aria-label={t("chat.expandPane")}
              className="absolute right-3 top-3 z-10"
              onClick={() => setRightPanelCollapsed(false)}
            />
          ) : null}
        </div>
      </Panel>
      <InspectorPane maximized={maximized} toggleWidth={toggleWidth} resetWidth={resetWidth} />
    </Group>
  )
}
