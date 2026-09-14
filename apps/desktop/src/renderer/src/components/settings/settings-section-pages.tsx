/**
 * 设置分段体：普通偏好页与并入的 Team / Customize / Automations 等。
 */
import type { ComponentType } from "react"
import { AccountNotificationsSection } from "@renderer/components/account/account-notifications-section"
import { AccountProfileSection } from "@renderer/components/account/account-profile-section"
import { AutomationsPage } from "@renderer/components/automations/automations-page"
import { CompanyBillingSection } from "@renderer/components/company/company-billing-section"
import { CompanyDetailsSection } from "@renderer/components/company/company-details-section"
import { CompanyIntegrationsSection } from "@renderer/components/company/company-integrations-section"
import { InstructionsSection } from "@renderer/components/customize/views/instructions-section"
import { RulesSection } from "@renderer/components/customize/views/rules-section"
import { TeamMembersSection } from "@renderer/components/team/team-members-section"
import { TeamProfileSection } from "@renderer/components/team/team-profile-section"
import { WorkspacesPage } from "@renderer/components/workspaces/workspaces-page"
import { useT } from "@renderer/i18n"
import { ProviderSettings } from "./providers/providers-settings"
import { AgentSettings } from "./settings-agent"
import { SettingsToolsPage } from "./tools/settings-tools-page"
import { AppearanceSettings } from "./settings-appearance"
import type { SettingsSectionId } from "./settings-catalog"
import { GeneralSettings } from "./settings-general"
import { GitSettings } from "./settings-git"
import { SettingsComingSoon } from "./settings-row"
import { ShortcutSettings } from "./settings-shortcuts"
import { WorkspaceSettings } from "./settings-workspace"
import { ExtensionsPage } from "./extensions/extensions-page"
import {
  CapabilitySettings,
  KnowledgeSettings,
  McpSettings,
  MediaSettings,
  SandboxSettings,
  TelemetrySettings,
  WorkflowSettings
} from "./settings-ai-pages"

export function SettingsSectionBody({ section }: { section: SettingsSectionId }) {
  const t = useT()
  const Page = SECTION_PAGES[section]
  if (!Page) return <SettingsComingSoon body={t("common.comingSoon")} />
  return <Page />
}

function WorkspaceSection() {
  return (
    <div className="flex flex-col gap-8">
      <WorkspaceSettings />
      <WorkspacesPage embed />
    </div>
  )
}

const SECTION_PAGES: Partial<Record<SettingsSectionId, ComponentType>> = {
  general: GeneralSettings,
  appearance: AppearanceSettings,
  shortcuts: ShortcutSettings,
  providers: ProviderSettings,
  agent: AgentSettings,
  tools: SettingsToolsPage,
  instructions: InstructionsSection,
  rules: RulesSection,
  workspace: WorkspaceSection,
  extensions: ExtensionsPage,
  mcp: McpSettings,
  capabilities: CapabilitySettings,
  knowledge: KnowledgeSettings,
  media: MediaSettings,
  workflow: WorkflowSettings,
  automations: AutomationsEmbedded,
  telemetry: TelemetrySettings,
  sandbox: SandboxSettings,
  git: GitSettings,
  team: TeamProfileSection,
  members: TeamMembersSection,
  billing: CompanyBillingSection,
  organization: CompanyDetailsSection,
  integrations: CompanyIntegrationsSection,
  account: AccountProfileSection,
  notifications: AccountNotificationsSection
}

function AutomationsEmbedded() {
  return <AutomationsPage embed />
}
