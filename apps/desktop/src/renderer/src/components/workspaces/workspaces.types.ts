/**
 * 文件夹与工作区管理数据模型。
 */
export interface WorkspaceItemData {
  id: string
  name: string
  path: string
  branch?: string
  sessionCount: number
  isCurrent: boolean
  lastActiveAt: string
}
