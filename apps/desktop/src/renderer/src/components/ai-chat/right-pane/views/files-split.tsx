/**
 * Files 内部分栏：左树右预览。拖拽分隔条改树宽，布局写入 localStorage。
 */
import { type ReactNode } from "react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
import { cx } from "@/utils/cx"

const SPLIT_ID = "enjoy-agents-files-tree-split"

/** 卡片内发丝分割：12px 热区，静止为 whisper 线，拖拽时 Signal Blue。 */
const HANDLE = cx(
  "relative z-10 w-3 shrink-0 cursor-col-resize bg-transparent outline-none",
  "after:absolute after:inset-y-3 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full",
  "after:bg-separator-border hover:after:bg-accent-500 data-active:after:bg-accent-500"
)

export function FilesSplit({ tree, children }: { tree: ReactNode; children: ReactNode }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: SPLIT_ID,
    storage: window.localStorage
  })

  return (
    <Group
      id={SPLIT_ID}
      orientation="horizontal"
      className="min-h-0 min-w-0 flex-1"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <Panel
        id="files-tree"
        minSize="160px"
        defaultSize="240px"
        maxSize="55%"
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {tree}
      </Panel>
      <Separator className={HANDLE} />
      <Panel id="files-preview" minSize="200px" className="min-h-0 min-w-0 overflow-hidden">
        {children}
      </Panel>
    </Group>
  )
}
