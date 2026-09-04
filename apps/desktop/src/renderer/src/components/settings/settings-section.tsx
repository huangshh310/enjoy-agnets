/**
 * 设置分段路由：按 hash section 挂载对应页。
 * 页面标题由壳层 h1 提供；各分段自己负责看板与卡片。
 */
import { useParams } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { findSettingsItem, getSettingsNav, isSettingsSectionId, type SettingsSectionId } from "./settings-catalog"
import { ArchivedChatsPage } from "./archived-chats-page"
import { SettingsSectionBody } from "./settings-section-pages"

export function SettingsSectionPage() {
  const t = useT()
  const params = useParams({ strict: false }) as { section?: string }
  const section: SettingsSectionId = isSettingsSectionId(params.section ?? "")
    ? (params.section as SettingsSectionId)
    : "general"
  const item = findSettingsItem(section, getSettingsNav(t))

  if (section === "archived") return <ArchivedChatsPage />
  if (section === "automations") return <SettingsSectionBody section={section} />
  if (section === "account") return <SettingsSectionBody section={section} />
  const title = item
    ? item.label.startsWith("nav.")
      ? t(item.label)
      : item.label
    : t("common.settings")

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title-3-semibold text-text-primary">{title}</h1>
      <SettingsSectionBody section={section} />
    </div>
  )
}
