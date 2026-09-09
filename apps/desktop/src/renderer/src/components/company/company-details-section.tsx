/**
 * 组织页：没有云端法人认证或企业域名同步。
 */
import { useT } from "@renderer/i18n"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"

export function CompanyDetailsSection() {
  const t = useT()
  return (
    <LocalOnlyNotice
      title={t("settings.localIntegrations.orgTitle")}
      body={t("settings.localIntegrations.orgBody")}
    />
  )
}
