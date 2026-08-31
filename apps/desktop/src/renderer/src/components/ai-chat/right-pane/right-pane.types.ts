/**
 * 右栏工具种类与标签。默认空态只列选项，点开后再挂内容。
 */
export type RightPaneKind = "review" | "terminal" | "browser" | "files"

export type RightPaneTab = {
  id: string
  kind: RightPaneKind
}
