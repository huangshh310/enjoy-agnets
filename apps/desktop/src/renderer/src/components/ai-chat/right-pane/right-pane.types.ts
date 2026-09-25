/**
 * 右栏工具种类与标签。默认空态只列选项，点开后再挂内容。
 */
export type RightPaneKind = "context" | "review" | "terminal" | "browser" | "files" | "desktop"

export type RightPaneTab = {
  id: string
  kind: RightPaneKind
  /** 浏览器标签当前预览的 http(s) 地址。 */
  url?: string
}
