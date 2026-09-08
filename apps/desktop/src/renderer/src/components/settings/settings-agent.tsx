/**
 * Settings → Agent：本机 CLI、进阶沙箱、作曲器默认值，用分段切换。
 */
import { useState } from "react"
import { RiApps2Line, RiCpuLine, RiEqualizer3Line, RiTerminalBoxLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { AcpRegistryPage } from "./agent-tools/acp-registry-page"
import { AgentToolsCommandHub } from "./agent-tools/agent-tools-command-hub"
import { AgentToolsPage } from "./agent-tools/agent-tools-page"
import { CapabilityMatrix } from "./agent-tools/capability-matrix"
import { ConfigBoundaryTable } from "./agent-tools/config-boundary-table"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"

type AgentSettingsTab = "racks" | "registry" | "harness" | "defaults"

export function AgentSettings() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<AgentSettingsTab>("racks")
  const tabs: Array<{ id: AgentSettingsTab; label: string; icon: typeof RiCpuLine }> = [
    { id: "racks", label: t("settings.agentTools.tabEngines"), icon: RiCpuLine },
    { id: "registry", label: t("settings.agentTools.tabRegistry"), icon: RiApps2Line },
    { id: "harness", label: t("settings.agentTools.tabSandbox"), icon: RiTerminalBoxLine },
    { id: "defaults", label: t("settings.agentTools.tabDefaults"), icon: RiEqualizer3Line }
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-fit items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const on = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-caption-1-medium ${
                on
                  ? "bg-background-primary-default font-semibold text-text-primary shadow-xs ring-1 ring-border-button-default"
                  : "text-text-secondary hover:bg-background-primary-default/60 hover:text-text-primary"
              }`}
            >
              <Icon className={`size-3.5 ${on ? "text-accent-500" : "text-text-tertiary"}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {activeTab === "racks" ? (
        <div className="flex flex-col gap-6">
          <AgentToolsCommandHub />
          <CapabilityMatrix />
          <ConfigBoundaryTable />
          <AgentToolsPage />
        </div>
      ) : null}
      {activeTab === "registry" ? <AcpRegistryPage /> : null}
      {activeTab === "harness" ? <SettingsHarness /> : null}
      {activeTab === "defaults" ? <SettingsDefaults /> : null}
    </div>
  )
}
