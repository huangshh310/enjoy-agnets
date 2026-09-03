/**
 * 个人中心页面壳：集成 SecondaryPageShell，分发 profile 与 notifications。
 */
import { useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { RiNotification3Line, RiShieldUserLine } from "@remixicon/react"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { AccountProfileSection } from "./account-profile-section"
import { AccountNotificationsSection } from "./account-notifications-section"

export function AccountPage() {
  const t = useT()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const currentSection = params.section === "notifications" ? "notifications" : "profile"

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "account_nav",
        label: t("chat.personal") || "Personal",
        items: [
          {
            id: "profile",
            label: "账户详情",
            icon: RiShieldUserLine
          },
          {
            id: "notifications",
            label: "通知偏好",
            icon: RiNotification3Line
          }
        ]
      }
    ],
    [t]
  )

  function handleSelect(id: string) {
    void navigate({
      to: "/account/$section",
      params: { section: id }
    })
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="搜索个人账户设置..."
      groups={navGroups}
      selectedId={currentSection}
      onSelect={handleSelect}
      contentWidth="wide"
      breadcrumbTitle={`个人中心 > ${currentSection === "notifications" ? "通知偏好" : "账户详情"}`}
    >
      {currentSection === "notifications" ? (
        <AccountNotificationsSection />
      ) : (
        <AccountProfileSection />
      )}
    </SecondaryPageShell>
  )
}
