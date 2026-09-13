/**
 * 团队中心页面壳：集成 SecondaryPageShell，承载团队资料与成员管理。
 */
import { useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { RiBankLine, RiGroupLine } from "@remixicon/react"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { TeamProfileSection } from "./team-profile-section"
import { TeamMembersSection } from "./team-members-section"

export function TeamPage() {
  const t = useT()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const currentSection = params.section === "members" ? "members" : "profile"

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "team_nav",
        label: t("chat.team") || "Team",
        items: [
          {
            id: "profile",
            label: "团队资料",
            icon: RiBankLine
          },
          {
            id: "members",
            label: "成员管理",
            icon: RiGroupLine
          }
        ]
      }
    ],
    [t]
  )

  function handleSelect(id: string) {
    void navigate({
      to: "/team/$section",
      params: { section: id }
    })
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="搜索团队设置..."
      groups={navGroups}
      selectedId={currentSection}
      onSelect={handleSelect}
      contentWidth="stage"
      breadcrumbTitle={`团队中心 > ${currentSection === "members" ? "成员管理" : "团队资料"}`}
    >
      {currentSection === "members" ? <TeamMembersSection /> : <TeamProfileSection />}
    </SecondaryPageShell>
  )
}
