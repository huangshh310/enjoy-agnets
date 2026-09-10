/**
 * 外部 CLI 配置抽屉正文：「这个助手用」在决策位，官方 inspect 账号随后。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentToolAccountPanel } from "./agent-tool-account-panel"
import { AgentToolAdvanced } from "./agent-tool-advanced"
import { AgentToolConfigOps } from "./agent-tool-config-ops"
import { AgentToolConfigSource } from "./agent-tool-config-source"
import { AgentToolLaunchPrefs } from "./launch-prefs/panel"
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
      <AgentToolProvider tool={tool} actions={actions} />
      <AgentToolAccountPanel tool={tool} />
      <AgentToolConfigSource tool={tool} actions={actions} />
      <AgentToolLaunchPrefs tool={tool} actions={actions} />
      <AgentToolAdvanced tool={tool} actions={actions} />
      <AgentToolConfigOps tool={tool} actions={actions} />
    </div>
  )
}
