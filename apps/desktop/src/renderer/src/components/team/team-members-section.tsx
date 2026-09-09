/**
 * 成员页：本地单机，没有组织同步或邀请席位。
 */
import { useT } from "@renderer/i18n"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"

export function TeamMembersSection() {
  const t = useT()
  return (
    <LocalOnlyNotice
      title={t("settings.localTeam.title")}
      body={t("settings.localTeam.membersBody")}
    />
  )
}
