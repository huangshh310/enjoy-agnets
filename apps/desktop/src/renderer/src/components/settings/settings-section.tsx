/**
 * 设置分段路由：按 hash section 挂载对应页。
 * 页面标题由壳层 h1 提供；各分段自己负责看板与卡片。
 */
import { useParams } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { ProviderSettings } from "./providers/providers-settings"
import { AgentSettings } from "./settings-agent"
import { AppearanceSettings } from "./settings-appearance"
import { findSettingsItem, getSettingsNav, isSettingsSectionId, type SettingsSectionId } from "./settings-catalog"
import { GeneralSettings } from "./settings-general"
import { GitSettings } from "./settings-git"
import { SettingsComingSoon } from "./settings-row"
import { ShortcutSettings } from "./settings-shortcuts"
import { WorkspaceSettings } from "./settings-workspace"
import { ArchivedChatsPage } from "./archived-chats-page"
import {
  CapabilitySettings,
  KnowledgeSettings,
  McpSettings,
  MediaSettings,
  SandboxSettings,
  TelemetrySettings,
  WorkflowSettings
} from "./settings-ai-pages"

export function SettingsSectionPage() {
  const t = useT()
  const params = useParams({ strict: false }) as { section?: string }
  const section: SettingsSectionId = isSettingsSectionId(params.section ?? "")
    ? (params.section as SettingsSectionId)
    : "general"
  const item = findSettingsItem(section, getSettingsNav(t))

  if (section === "archived") return <ArchivedChatsPage />

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title-3-semibold text-text-primary">{item?.label ?? t("common.settings")}</h1>
      <SettingsSectionBody section={section} />
    </div>
  )
}

function SettingsSectionBody({ section }: { section: SettingsSectionId }) {
  const t = useT()
  if (section === "general") return <GeneralSettings />
  if (section === "appearance") return <AppearanceSettings />
  if (section === "shortcuts") return <ShortcutSettings />
  if (section === "providers") return <ProviderSettings />
  if (section === "agent") return <AgentSettings />
  if (section === "workspace") return <WorkspaceSettings />
  if (section === "mcp") return <McpSettings />
  if (section === "capabilities") return <CapabilitySettings />
  if (section === "knowledge") return <KnowledgeSettings />
  if (section === "media") return <MediaSettings />
  if (section === "workflow") return <WorkflowSettings />
  if (section === "telemetry") return <TelemetrySettings />
  if (section === "sandbox") return <SandboxSettings />
  if (section === "git") return <GitSettings />
  return <SettingsComingSoon body={t("common.comingSoon")} />
}
