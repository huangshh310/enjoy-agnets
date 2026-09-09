/**
 * 团队资料：本地单机，没有云端组织或配额池。
 */
import { useT } from "@renderer/i18n"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"

export function TeamProfileSection() {
  const t = useT()
  return (
    <LocalOnlyNotice
      title={t("settings.localTeam.title")}
      body={t("settings.localTeam.body")}
    />
  )
}
