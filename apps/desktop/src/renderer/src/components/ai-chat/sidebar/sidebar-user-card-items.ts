/**
 * 侧栏底部用户信息与团队菜单项构建器。
 * 对应 BoardUI 标准三段式菜单（工作区、组织、个人）。
 */
import {
  RiBankCardLine,
  RiBankLine,
  RiBox3Line,
  RiFolder6Line,
  RiGroupLine,
  RiLogoutBoxRLine,
  RiMessage2Line,
  RiNotification3Line,
  RiSchoolLine,
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
  onNavigate,
  onSignOut
}: CreateMenuItemsOptions): UserCardMenuGroup[] {
  return [
    {
      id: "workspace",
      items: [
        {
          id: "team-profile",
          icon: RiBankLine,
          label: t("chat.teamProfile") || "View team profile",
          onClick: () => onNavigate("/team/profile")
        },
        {
          id: "folders",
          icon: RiFolder6Line,
          label: t("chat.folders") || "Folders",
          onClick: () => onNavigate("/workspaces")
        },
        {
          id: "messages",
          icon: RiMessage2Line,
          label: t("chat.messages") || "Messages",
          badge: "8",
          onClick: () => onNavigate("/inbox")
        },
        {
          id: "people",
          icon: RiGroupLine,
          label: t("chat.people") || "People",
          onClick: () => onNavigate("/team/members")
        }
      ]
    },
    {
      id: "company",
      label: t("chat.company") || "Company",
      items: [
        {
          id: "billing",
          icon: RiBankCardLine,
          label: t("chat.billing") || "Billing",
          onClick: () => onNavigate("/company/billing")
        },
        {
          id: "company-details",
          icon: RiSchoolLine,
          label: t("chat.companyDetails") || "Company Details",
          onClick: () => onNavigate("/company/details")
        },
        {
          id: "integrations",
          icon: RiBox3Line,
          label: t("chat.integrations") || "Integrations",
          onClick: () => onNavigate("/company/integrations")
        }
      ]
    },
    {
      id: "personal",
      label: t("chat.personal") || "Personal",
      items: [
        {
          id: "notifications",
          icon: RiNotification3Line,
          label: t("chat.notifications") || "Notifications",
          onClick: () => onNavigate("/account/notifications")
        },
        {
          id: "account-details",
          icon: RiShieldUserLine,
          label: t("chat.accountDetails") || "Account Details",
          onClick: () => onNavigate("/account/profile")
        },
        {
          id: "sign-out",
          icon: RiLogoutBoxRLine,
          label: t("chat.signOut") || "Sign out",
          onClick: () => (onSignOut ? onSignOut() : onNavigate("/"))
        }
      ]
    }
  ]
}
