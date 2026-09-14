/**
 * 外部 CLI 配置抽屉正文：顶栏信任卡，然后「这个助手用」，官方 inspect 随后。
 */
import { useNavigate } from "@tanstack/react-router"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentToolAccountPanel } from "./agent-tool-account-panel"
import { AgentToolAdvanced } from "./agent-tool-advanced"
import { AgentToolConfigOps } from "./agent-tool-config-ops"
import { NativePluginCopy } from "./native-plugin-copy"
import { AgentToolConfigSource } from "./agent-tool-config-source"
import { DrawerTrustStrip } from "./drawer-trust/drawer-trust-strip"
import { AgentToolLaunchPrefs } from "./launch-prefs/panel"
import { AgentToolPowerSlot } from "./power-source/agent-tool-power-slot"
import { AgentToolUsageSection } from "./agent-tool-usage-section"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigCli({
  tool,
  actions,
  onClose
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  onClose: () => void
}) {
  const navigate = useNavigate()
  function onViewUsage() {
    onClose()
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tab: "subscriptions" }
    })
  }
  return (
    <div className="space-y-4">
      <DrawerTrustStrip tool={tool} actions={actions} onViewUsage={onViewUsage} />
      <AgentToolUsageSection tool={tool} onViewDashboard={onViewUsage} />
      <AgentToolPowerSlot tool={tool} actions={actions} />
      <AgentToolAccountPanel tool={tool} />
      <AgentToolConfigSource tool={tool} actions={actions} />
      <AgentToolLaunchPrefs tool={tool} actions={actions} />
      <NativePluginCopy tool={tool} />
      <AgentToolAdvanced tool={tool} actions={actions} />
      <AgentToolConfigOps tool={tool} actions={actions} />
    </div>
  )
}
