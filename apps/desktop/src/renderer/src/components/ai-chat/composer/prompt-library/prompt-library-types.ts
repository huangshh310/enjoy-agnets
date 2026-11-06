/**
 * 提示收藏面板行：本会话召回 ∪ 库内星标（及近期）。
 */
export type PromptLibraryRow = {
  /** 库内有 id；纯会话召回用 text 派生临时键 */
  id: string
  text: string
  starred: boolean
  /** library = 库内；session = 仅本会话召回 */
  source: "library" | "session"
  updatedAt?: number
}
