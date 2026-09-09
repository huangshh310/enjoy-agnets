/**
 * 侧栏底栏用户菜单：本机入口，没有退出登录或云账单。
 */
import { RiFolder6Line, RiGroupLine, RiMessage2Line, RiSettings4Line } from "@remixicon/react"
import type { UserCardMenuGroup } from "./sidebar-user-card.types"

export const APP_VERSION = "v0.1.0"
export const DEFAULT_USER_EMAIL = "local"

export interface CreateMenuItemsOptions {
  t: (key: string, values?: Record<string, string | number>) => string
  onOpenWorkspace?: () => void
  onNavigate: (to: string) => void
  sessionCount?: number
}

/** 工作区 / 设置 / Inbox。账单只在设置页，菜单不假装已登录云账号。 */
export function buildUserCardMenuGroups({
  t,
  onOpenWorkspace,
  onNavigate
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
      label: t("chat.preferencesSection") || "设置",
      items: [
        {
          id: "general-settings",
          icon: RiSettings4Line,
          label: t("common.settings") || "偏好设置",
          onClick: () => onNavigate("/settings/general")
        }
      ]
    }
  ]
}
