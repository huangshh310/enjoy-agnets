/**
 * Settings → Agent：本机 CLI、Registry、进阶沙箱、作曲器默认值。
 */
import { useEffect, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { AcpRegistryPage } from "./agent-tools/acp-registry-page"
import { AgentCapabilityDocs } from "./agent-tools/agent-capability-docs"
import { resolveAgentDocsJump } from "./agent-tools/agent-tool-anchor"
import { AgentToolsCommandHub } from "./agent-tools/agent-tools-command-hub"
import { AgentToolsPage } from "./agent-tools/agent-tools-page"
import { parseAgentSettingsTab, type AgentSettingsTab } from "./settings-agent-tab"
import { AgentSettingsTabs } from "./settings-agent-tabs"
import { parseSettingsSectionSearch } from "./settings-section-search"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
import { SettingsSkillSources } from "./settings-skill-sources"

export function AgentSettings() {
  const navigate = useNavigate()
  const search = parseSettingsSectionSearch(useSearch({ strict: false }))
  const fromUrl = parseAgentSettingsTab(search.tab)
  const toolId = search.tool?.trim() ?? ""
  const [activeTab, setActiveTab] = useState<AgentSettingsTab>(toolId ? "racks" : fromUrl)
  const [focus, setFocus] = useState<{ id: string; at: number } | null>(null)

  useEffect(() => {
    setActiveTab(fromUrl)
  }, [fromUrl])

  useEffect(() => {
    if (!toolId) return
    setActiveTab("racks")
    setFocus({ id: toolId, at: Date.now() })
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tab: undefined, tool: undefined },
      replace: true
    })
  }, [toolId, navigate])

  function selectTab(id: AgentSettingsTab) {
    setActiveTab(id)
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tab: id === "racks" ? undefined : id, tool: undefined },
      replace: true
    })
  }

  function onDocsJump(runtimeId: string) {
    const jump = resolveAgentDocsJump(runtimeId)
    if (jump.kind === "harness") {
      selectTab("harness")
      return
    }
    setFocus({ id: jump.id, at: Date.now() })
  }

  return (
    <div className="flex flex-col gap-5">
      <AgentSettingsTabs activeTab={activeTab} onSelect={selectTab} />
      {activeTab === "racks" ? (
        <div className="flex flex-col gap-6">
          <AgentToolsCommandHub />
          <AgentToolsPage focus={focus} />
          <AgentCapabilityDocs onJump={onDocsJump} />
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
