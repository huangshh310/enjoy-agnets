/**
 * 外部 CLI 配置：模型、动力源、路径、登录与连通性。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentToolAccountPanel } from "./agent-tool-account-panel"
import { AgentToolAdvanced } from "./agent-tool-advanced"
import { AgentToolConfigOps } from "./agent-tool-config-ops"
import { AgentToolConfigSource } from "./agent-tool-config-source"
import { AgentToolProvider } from "./agent-tool-provider"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigCli({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  return (
    <div className="space-y-4">
      <AgentToolAccountPanel tool={tool} />
      <AgentToolConfigSource tool={tool} actions={actions} />
      <AgentToolProvider tool={tool} actions={actions} />
      <AgentToolAdvanced tool={tool} actions={actions} always />
      <AgentToolConfigOps actions={actions} />
    </div>
  )
}
