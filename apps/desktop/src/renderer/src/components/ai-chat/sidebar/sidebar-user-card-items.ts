/**
 * 侧栏底部用户信息与团队菜单项构建器。
 * 对应 BoardUI 标准三段式菜单（工作区、组织、个人）。
 */
import {
  RiBankCardLine,
  RiFolder6Line,
  RiGroupLine,
  RiLogoutBoxRLine,
  RiMessage2Line,
  RiSettings4Line,
  RiShieldUserLine
} from "@remixicon/react"
import type { UserCardMenuGroup } from "./sidebar-user-card.types"

export const APP_VERSION = "v0.1.0"
export const DEFAULT_USER_EMAIL = "team@enjoy-agents.dev"

export interface CreateMenuItemsOptions {
  t: (key: string, values?: Record<string, string | number>) => string
  onOpenWorkspace?: () => void
  onNavigate: (to: string) => void
  onSignOut?: () => void
  sessionCount?: number
}

/**
 * 构建完整的菜单分组列表
 */
export function buildUserCardMenuGroups({
  t,
  onOpenWorkspace,
  onNavigate,
  onSignOut
}: CreateMenuItemsOptions): UserCardMenuGroup[] {
  return [
    {
      id: "workspace",
      label: t("chat.workspaceSection") || "工作空间",
      items: [
        {
          id: "team-profile",
          icon: RiGroupLine,
          label: t("chat.teamAndMembers") || "团队与成员",
          onClick: () => onNavigate("/settings/team")
        },
        {
          id: "folders",
          icon: RiFolder6Line,
          label: t("chat.openWorkspaceFolder") || "打开工作区文件夹",
          onClick: () => (onOpenWorkspace ? onOpenWorkspace() : onNavigate("/settings/workspace"))
        },
        {
          id: "messages",
          icon: RiMessage2Line,
          label: t("chat.inboxNotifications") || "消息中心",
          onClick: () => onNavigate("/inbox")
        }
      ]
    },
    {
      id: "preferences",
      label: t("chat.preferencesSection") || "设置与订阅",
      items: [
        {
          id: "general-settings",
          icon: RiSettings4Line,
          label: t("common.settings") || "偏好设置",
          onClick: () => onNavigate("/settings/general")
        },
        {
          id: "billing",
          icon: RiBankCardLine,
          label: t("chat.billing") || "订阅与账单",
          onClick: () => onNavigate("/settings/billing")
        }
      ]
    },
    {
      id: "account",
      label: t("chat.accountSection") || "账户",
      items: [
        {
          id: "account-details",
          icon: RiShieldUserLine,
          label: t("chat.accountDetails") || "个人资料",
          onClick: () => onNavigate("/settings/account")
        },
        {
          id: "sign-out",
          icon: RiLogoutBoxRLine,
          label: t("chat.signOut") || "退出登录",
          onClick: () => (onSignOut ? onSignOut() : onNavigate("/"))
        }
      ]
    }
  ]
}
