/**
 * Inspector 始终挂在树上：收起走 Panel.collapse，不要 unmount。
 * 窄窗（drawer.active）：分栏里的 Panel 保持收起，同一个 RightPane 改用 fixed 抽屉画在主区右侧上方，
 * 不再被压成 0 宽、画到窗外；同一个树位置换样式，不重挂。
 * 宽度：记住用户上次定的百分比（拖分隔条 / 加宽、复原按钮）；窗口放宽（含从抽屉回到并排）时回到这个百分比，
 * 分栏窄到放不下时按最小栏宽 280px，不是固定 38%。
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
  INSPECTOR_DEFAULT_PERCENT,
  INSPECTOR_DEFAULT_SIZE,
  INSPECTOR_MIN_PX,
  inspectorOpenSize,
  inspectorRestorePercent,
  needsInspectorDefaultSize,
  preferredInspectorPercent,
  type InspectorPanelSize
} from "./inspector-panel-size"

type InspectorPanelHandle = {
  collapse: () => void
  expand: () => void
  resize: (size: string) => void
  getSize: () => InspectorPanelSize
}

/**
 * 打开：expand 回到库记的收起前尺寸；还是一条缝就回到用户上次的百分比（没有记录用默认 38%），
 * 这个百分比在当前分栏里不到最小栏宽时按 280px 打开（库会把不足最小宽的可折叠栏吸成 0）。
 */
function applyInspectorCollapsed(
  panel: InspectorPanelHandle,
  collapsed: boolean,
  preferredPercent: number | null,
  groupPx: number
) {
  if (collapsed) {
    panel.collapse()
    return
  }
  panel.expand()
  if (needsInspectorDefaultSize(panel.getSize().inPixels)) {
    panel.resize(inspectorOpenSize(preferredPercent ?? INSPECTOR_DEFAULT_PERCENT, groupPx))
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

  // 用户上次定的宽度（百分比）：拖完分隔条、点完加宽 / 复原按钮后记下；窗口变窄被库挤小的不记。
  // 窗口再放宽（含从抽屉回到并排）时回到它，不是固定 38%。
  const preferredPercentRef = useRef<number | null>(null)
  const groupPxRef = useRef(drawer.groupWidth)
  groupPxRef.current = drawer.groupWidth
  const applyCollapsed = useCallback((panel: InspectorPanelHandle, next: boolean) => {
    applyInspectorCollapsed(panel, next, preferredPercentRef.current, groupPxRef.current)
  }, [])

  // 必须用 useEffect：useLayoutEffect 会在 Group 注册前调用 expand/collapse，
  // 抛出 Group enjoy-agents-chat-split not found。
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    try {
      applyCollapsed(panel, panelCollapsed)
      return
    } catch {
      const frame = requestAnimationFrame(() => {
        const next = panelRef.current
        if (!next) return
        try {
          applyCollapsed(next, panelCollapsed)
        } catch {
          // Group 仍未就绪；下次 collapsed 变化再试
        }
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [panelCollapsed, panelRef, applyCollapsed])

  // 分栏宽度变了（1440 → 800 抽屉 → 一路放宽）：比用户上次的百分比窄、或被压成 0 就拉回去，库再按工作台最小宽夹住。
  // 不然离开抽屉那一下库还按旧的窄分栏算、把栏吸成 0，之后越放越宽也一直停在 0 / 被挤小的宽度。
  // 等两帧：让库自己的 ResizeObserver 先量到新分栏宽。
  useEffect(() => {
    if (panelCollapsed) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const panel = panelRef.current
        if (!panel) return
        try {
          const target = inspectorRestorePercent(panel.getSize(), preferredPercentRef.current)
          if (target != null) panel.resize(inspectorOpenSize(target, groupPxRef.current))
        } catch {
          // Group 尚未注册
        }
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [drawer.groupWidth, panelCollapsed, panelRef])

  // 记用户宽度：只在拖分隔条松手、点加宽 / 复原按钮之后读一次（等两帧库排完版），其它尺寸变化都不算。
  const separatorRef = useRef<HTMLDivElement | null>(null)
  const rememberPreferred = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const panel = panelRef.current
        if (!panel || !wantOpenRef.current) return
        try {
          const percent = preferredInspectorPercent(panel.getSize())
          if (percent != null) preferredPercentRef.current = percent
        } catch {
          // Group 尚未注册
        }
      })
    )
  }, [panelRef])
  useEffect(() => {
    let dragging = false
    const onDown = (event: PointerEvent) => {
      dragging = event.target instanceof Node && Boolean(separatorRef.current?.contains(event.target))
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      rememberPreferred()
    }
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("pointerup", onUp, true)
    return () => {
      window.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("pointerup", onUp, true)
    }
  }, [rememberPreferred])
  // 退出「加宽」（按钮、收起、切模块都会复原到 38%）：重新记一次，别把加宽时的 58% 当成用户宽度。
  useEffect(() => {
    if (!maximized) rememberPreferred()
  }, [maximized, rememberPreferred])
  const toggleWidthAndRemember = useCallback(() => {
    toggleWidth()
    rememberPreferred()
  }, [toggleWidth, rememberPreferred])

  // 开关说「开着」但分栏里只剩 0 / 一条缝（窄窗被库压扁、放宽后没人再 expand；luna / jojo main157-patrol）：
  // 再点「去审查」/ 打开别的标签、或面板被压到最小宽以下时，立刻拉回来（用户上次的宽度 / 默认 38% / 最小 280），不用点两次开关。
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
      applyCollapsed(panel, false)
    } catch {
      // Group 尚未注册
    }
  }, [panelRef, applyCollapsed])
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
    (size: InspectorPanelSize) => {
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
        elementRef={separatorRef}
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
          // #173：收起后内容仍在树里（Panel 宽 0），8 个工具按钮还能 Tab 到。inert 让焦点跳过整栏。
          inert={panelCollapsed && !drawerOpen ? true : undefined}
          aria-hidden={panelCollapsed && !drawerOpen ? true : undefined}
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
            toggleWidth={toggleWidthAndRemember}
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
