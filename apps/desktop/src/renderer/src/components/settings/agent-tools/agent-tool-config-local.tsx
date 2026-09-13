/**
 * Enjoy 本地配置：与各家 CLI 同壳，决策槽仍是「这个助手用」。
 */
import { useNavigate } from "@tanstack/react-router"
import { useAgentToolActions } from "./use-agent-tool-actions"
import { AgentToolPowerSlot } from "./power-source/agent-tool-power-slot"
import { AgentToolUsageSection } from "./agent-tool-usage-section"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

export function AgentToolConfigLocal({
  tool,
  onClose
}: {
  tool: AgentToolPublic
  onClose?: () => void
}) {
  const navigate = useNavigate()
  const actions = useAgentToolActions(tool)
  function onViewUsage() {
    onClose?.()
    void navigate({
      to: "/settings/$section",
      params: { section: "agent" },
      search: { tab: "subscriptions" }
    })
  }
  return (
    <div className="space-y-4">
      <AgentToolUsageSection tool={tool} onViewDashboard={onViewUsage} />
      <AgentToolPowerSlot tool={tool} actions={actions} />
    </div>
  )
}
