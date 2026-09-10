/**
 * Enjoy 本地配置：与各家 CLI 同壳，决策槽仍是「这个助手用」。
 */
import { useAgentToolActions } from "./use-agent-tool-actions"
import { AgentToolPowerSlot } from "./power-source/agent-tool-power-slot"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

export function AgentToolConfigLocal({
  tool
}: {
  tool: AgentToolPublic
  onClose?: () => void
}) {
  const actions = useAgentToolActions(tool)
  return (
    <div className="space-y-4">
      <AgentToolPowerSlot tool={tool} actions={actions} />
    </div>
  )
}
