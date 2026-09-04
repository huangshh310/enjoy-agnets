/**
 * 审查栏分栏：左 diff、右文件树。拖拽分隔条改树宽，写入 localStorage。
 */

import { type ReactNode } from "react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"
import { cx } from "@/utils/cx"

const SPLIT_ID = "enjoy-agents-review-tree-split"

const HANDLE = cx(
  "relative z-10 w-3 shrink-0 cursor-col-resize bg-transparent outline-none",
  "after:absolute after:inset-y-3 after:left-1/2 after:w-px after:-translate-x-1/2 after:rounded-full",
  "after:bg-separator-border hover:after:bg-accent-500 data-active:after:bg-accent-500"
)

export function ReviewSplit(props: { tree: ReactNode; children: ReactNode }) {
  const { tree, children } = props
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
      <Panel id="review-diff" minSize="200px" className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {children}
      </Panel>
      <Separator className={HANDLE} />
      <Panel
        id="review-tree"
        minSize="140px"
        defaultSize="200px"
        maxSize="50%"
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {tree}
      </Panel>
    </Group>
  )
}
