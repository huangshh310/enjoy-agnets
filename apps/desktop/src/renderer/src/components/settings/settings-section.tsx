/**
 * 设置分段路由：按 hash section 挂载对应页。
 * 多数分段由壳层提供 h1；Providers / Account / Billing 等自带标题，不要再叠一层。
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
  if (section === "automations") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SettingsSectionBody section={section} />
      </div>
    )
  }
  if (section === "account") return <SettingsSectionBody section={section} />
  if (section === "billing") return <SettingsSectionBody section={section} />
  if (section === "extensions") return <SettingsSectionBody section={section} />
  if (section === "skills" || section === "mcp") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SettingsSectionBody section={section} />
      </div>
    )
  }
  if (section === "telemetry") return <SettingsSectionBody section={section} />
  if (section === "providers") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SettingsSectionBody section={section} />
      </div>
    )
  }
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
