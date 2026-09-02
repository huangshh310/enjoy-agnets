/**
 * 侧栏底部用户信息卡片与菜单类型定义。
 */
import type { ComponentType } from "react"

export type MenuIconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export interface UserCardMenuItem {
  id: string
  icon: MenuIconComponent
  label: string
  badge?: string | number
  isSelected?: boolean
  onClick?: () => void
}

export interface UserCardMenuGroup {
  id: string
  label?: string
  items: UserCardMenuItem[]
}

export interface SidebarUserCardProps {
  /** 侧栏是否处于折叠状态 */
  collapsed: boolean
  /** 用户或团队名称 */
  userName?: string
  /** 邮箱或副标题说明 */
  userEmail?: string
  /** 打开工作区回调 */
  onOpenWorkspace?: () => void
  /** 会话消息总数或徽标数 */
  sessionCount?: number
  /** 自定义外层样式类名 */
  className?: string
}
