/**
 * Inspector 始终挂在树上：收起走 Panel.collapse，不要 unmount。
 * 窄窗（drawer.active）：分栏里的 Panel 保持收起，同一个 RightPane 改用 fixed 抽屉画在主区右侧上方，
 * 不再被压成 0 宽、画到窗外；同一个树位置换样式，不重挂。
 */
import { useCallback, useEffect, useRef } from "react"
import { Panel, Separator, usePanelRef } from "react-resizable-panels"
import { cx } from "@/utils/cx"
import { RightPane } from "@renderer/components/ai-chat/right-pane/right-pane"
import { RIGHT_PANE_REVEAL_EVENT } from "@renderer/components/ai-chat/right-pane/open-pane"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useRightPaneStore } from "@renderer/stores/right-pane-store"
import type { InspectorDrawer } from "./use-inspector-drawer"
import {
  INSPECTOR_DEFAULT_SIZE,
  INSPECTOR_MIN_PX,
  needsInspectorDefaultSize
} from "./inspector-panel-size"

type InspectorPanelHandle = {
  collapse: () => void
  expand: () => void
  resize: (size: string) => void
  getSize: () => { inPixels: number }
}

function applyInspectorCollapsed(panel: InspectorPanelHandle, collapsed: boolean) {
  if (collapsed) {
    panel.collapse()
    return
  }
  panel.expand()
  if (needsInspectorDefaultSize(panel.getSize().inPixels)) {
    panel.resize(INSPECTOR_DEFAULT_SIZE)
  }
}

export function InspectorPane({
  maximized,
  toggleWidth,
  resetWidth,
  drawer
}: {
  maximized: boolean
  toggleWidth: () => void
  resetWidth: () => void
  drawer: InspectorDrawer
}) {
  const collapsed = useChatStore((state) => state.rightPanelCollapsed)
  const setCollapsed = useChatStore((state) => state.setRightPanelCollapsed)
  const panelRef = usePanelRef()
  // 抽屉模式下分栏里的 Panel 一直收起，主区占满；抽屉开关只看 collapsed。
  const panelCollapsed = collapsed || drawer.active
  const drawerOpen = drawer.active && !collapsed

  // 必须用 useEffect：useLayoutEffect 会在 Group 注册前调用 expand/collapse，
  // 抛出 Group enjoy-agents-chat-split not found。
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    try {
      applyInspectorCollapsed(panel, panelCollapsed)
      return
    } catch {
      const frame = requestAnimationFrame(() => {
        const next = panelRef.current
        if (!next) return
        try {
          applyInspectorCollapsed(next, panelCollapsed)
        } catch {
          // Group 仍未就绪；下次 collapsed 变化再试
        }
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [panelCollapsed, panelRef])

  // 开关说「开着」但分栏里只剩 0 / 一条缝（窄窗被库压扁、放宽后没人再 expand；luna / jojo main157-patrol）：
  // 再点「去审查」/ 打开别的标签、或面板被压到最小宽以下时，立刻按默认宽度拉回来，不用点两次开关。
  const wantOpenRef = useRef(!panelCollapsed)
  wantOpenRef.current = !panelCollapsed
  const retriesRef = useRef(0)
  useEffect(() => {
    retriesRef.current = 0
  }, [panelCollapsed])
  const reopenIfSquashed = useCallback(() => {
    if (!wantOpenRef.current) return
    const panel = panelRef.current
    if (!panel) return
    try {
      if (!needsInspectorDefaultSize(panel.getSize().inPixels)) return
      applyInspectorCollapsed(panel, false)
    } catch {
      // Group 尚未注册
    }
  }, [panelRef])
  const activeTabId = useRightPaneStore((state) => state.activeId)
  const tabCount = useRightPaneStore((state) => state.tabs.length)
  useEffect(() => {
    reopenIfSquashed()
  }, [activeTabId, tabCount, reopenIfSquashed])
  useEffect(() => {
    const onReveal = () => requestAnimationFrame(reopenIfSquashed)
    window.addEventListener(RIGHT_PANE_REVEAL_EVENT, onReveal)
    return () => window.removeEventListener(RIGHT_PANE_REVEAL_EVENT, onReveal)
  }, [reopenIfSquashed])
  const onPanelResize = useCallback(
    (size: { inPixels: number }) => {
      if (!wantOpenRef.current || !needsInspectorDefaultSize(size.inPixels)) return
      // 放不下时库会再压回去：每次打开最多补三次，防止来回抖。
      if (retriesRef.current >= 3) return
      retriesRef.current += 1
      requestAnimationFrame(reopenIfSquashed)
    },
    [reopenIfSquashed]
  )

  return (
    <>
      <Separator
        disabled={panelCollapsed}
        className={cx(
          "relative z-10 shrink-0 bg-transparent outline-none",
          panelCollapsed
            ? "hidden w-0"
            : "w-3 cursor-col-resize after:absolute after:inset-y-8 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:bg-border-button-default data-active:after:bg-accent-500"
        )}
      />
      <Panel
        id="changes"
        panelRef={panelRef}
        onResize={onPanelResize}
        collapsible
        collapsedSize="0px"
        minSize={`${INSPECTOR_MIN_PX}px`}
        defaultSize={INSPECTOR_DEFAULT_SIZE}
        // globals.css 给 .right-pane-panel 挂了 isolation:isolate；抽屉要盖住主区（composer 是 z-10），
        // 得让 z-40 逃出这层叠放上下文（不加 ! 压不过不在 layer 里的全局样式）。
        className={cx("right-pane-panel min-h-0", drawer.active && "isolation-auto!")}
      >
        <div
          data-testid="inspector-host"
          data-drawer={drawer.active ? (drawerOpen ? "open" : "closed") : "off"}
          className={
            drawer.active
              ? cx(
                  "fixed z-40 flex min-h-0 flex-col rounded-3xl bg-background-primary-default shadow-xl",
                  !drawerOpen && "hidden"
                )
              : "h-full min-h-0"
          }
          style={
            drawer.active
              ? { top: drawer.top, right: drawer.right, bottom: drawer.bottom, width: drawer.width }
              : undefined
          }
        >
          <InspectorBody
            maximized={maximized}
            toggleWidth={toggleWidth}
            resetWidth={resetWidth}
            onCollapsed={() => setCollapsed(true)}
          />
        </div>
      </Panel>
    </>
  )
}

function InspectorBody({
  maximized,
  toggleWidth,
  resetWidth,
  onCollapsed
}: {
  maximized: boolean
  toggleWidth: () => void
  resetWidth: () => void
  onCollapsed: () => void
}) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const changes = useChatStore((state) => state.changes)
  const additions = useChatStore((state) => state.additions)
  const deletions = useChatStore((state) => state.deletions)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const selectedFileContent = useChatStore((state) => state.selectedFileContent)
  const onSelectFile = useCallback((path: string) => {
    void openChangedFile(path)
  }, [])
  return (
    <RightPane
      workspaceId={workspaceId}
      changes={changes}
      additions={additions}
      deletions={deletions}
      selectedFilePath={selectedFilePath}
      selectedFileContent={selectedFileContent}
      onSelectFile={onSelectFile}
      onCollapse={() => {
        resetWidth()
        onCollapsed()
      }}
      maximized={maximized}
      onToggleWidth={toggleWidth}
    />
  )
}
