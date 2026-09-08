/**
 * Settings → Agent：本机 CLI、Registry、进阶沙箱、作曲器默认值。
 */
import { useEffect, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { AcpRegistryPage } from "./agent-tools/acp-registry-page"
import { AgentToolsCommandHub } from "./agent-tools/agent-tools-command-hub"
import { AgentToolsPage } from "./agent-tools/agent-tools-page"
import { CapabilityMatrix } from "./agent-tools/capability-matrix"
import { ConfigBoundaryTable } from "./agent-tools/config-boundary-table"
import { parseAgentSettingsTab, type AgentSettingsTab } from "./settings-agent-tab"
import { AgentSettingsTabs } from "./settings-agent-tabs"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
import { SettingsSkillSources } from "./settings-skill-sources"

export function AgentSettings() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tab?: string }
  const fromUrl = parseAgentSettingsTab(search.tab)
  const [activeTab, setActiveTab] = useState<AgentSettingsTab>(fromUrl)

  useEffect(() => {
    setActiveTab(fromUrl)
  }, [fromUrl])

  function selectTab(id: AgentSettingsTab) {
    setActiveTab(id)
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tab: id === "racks" ? undefined : id },
      replace: true
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <AgentSettingsTabs activeTab={activeTab} onSelect={selectTab} />
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
      {activeTab === "defaults" ? (
        <div className="flex flex-col gap-6">
          <SettingsDefaults />
          <SettingsSkillSources />
        </div>
      ) : null}
    </div>
  )
}
