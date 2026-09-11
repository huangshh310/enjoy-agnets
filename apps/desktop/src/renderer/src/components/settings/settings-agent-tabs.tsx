/**
 * 智能体设置分段条：本机 CLI / Registry / 沙箱 / 默认项。
 */
import { RiApps2Line, RiCpuLine, RiEqualizer3Line, RiSparklingLine, RiTerminalBoxLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { AgentSettingsTab } from "./settings-agent-tab"

const ICONS = {
  racks: RiCpuLine,
  subscriptions: RiSparklingLine,
  registry: RiApps2Line,
  harness: RiTerminalBoxLine,
  defaults: RiEqualizer3Line
} as const

export function AgentSettingsTabs({
  activeTab,
  onSelect
}: {
  activeTab: AgentSettingsTab
  onSelect: (id: AgentSettingsTab) => void
}) {
  const t = useT()
  const tabs: Array<{ id: AgentSettingsTab; label: string }> = [
    { id: "racks", label: t("settings.agentTools.tabEngines") },
    { id: "subscriptions", label: t("settings.agentTools.tabSubscriptions") },
    { id: "registry", label: t("settings.agentTools.tabRegistry") },
    { id: "harness", label: t("settings.agentTools.tabSandbox") },
    { id: "defaults", label: t("settings.agentTools.tabDefaults") }
  ]
  return (
    <div className="flex w-fit items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default/50 p-1">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id]
        const on = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-caption-1-medium ${
              on
                ? "bg-background-primary-default text-text-primary shadow-xs ring-1 ring-border-button-default"
                : "text-text-secondary hover:bg-background-primary-default/60 hover:text-text-primary"
            }`}
          >
            <Icon className={`size-3.5 ${on ? "text-accent-500" : "text-text-tertiary"}`} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
