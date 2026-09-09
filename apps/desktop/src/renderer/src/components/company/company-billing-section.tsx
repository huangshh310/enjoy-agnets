/**
 * 账单页：本地单机，没有自营套餐或升级弹窗。
 */
import { useT } from "@renderer/i18n"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"

export function CompanyBillingSection() {
  const t = useT()
  return <LocalOnlyNotice title={t("settings.localBilling.title")} body={t("settings.localBilling.body")} />
}
