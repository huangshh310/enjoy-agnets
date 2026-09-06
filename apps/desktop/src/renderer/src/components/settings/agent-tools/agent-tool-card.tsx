/**
 * 智能体卡片：组合头部、动力源、行动条与高级配置。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentToolAdvanced } from "./agent-tool-advanced"
import { AgentToolActionsBar } from "./agent-tool-actions"
import { AgentToolHeader } from "./agent-tool-header"
import { AgentToolProvider } from "./agent-tool-provider"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolCard({ tool }: { tool: AgentToolPublic }) {
  const actions = useAgentToolActions(tool)
  const ready = tool.status === "ready" || actions.isDefaultLocal
  return (
    <article
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 ${
        actions.isActive
          ? "border-accent-500/50 bg-background-primary-default shadow-card ring-1 ring-accent-500/20"
          : ready
            ? "border-border-button-default bg-background-primary-default shadow-2xs hover:border-border-button-hover"
            : "border-dashed border-border-button-default bg-background-secondary-default/40 opacity-90"
      }`}
    >
      {actions.isActive ? (
        <div className="absolute -top-px right-8 left-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-accent-500 to-transparent" />
      ) : null}
      <div className="flex flex-col gap-3.5 p-5">
        <AgentToolHeader tool={tool} actions={actions} />
        <AgentToolProvider tool={tool} actions={actions} />
        <AgentToolActionsBar tool={tool} actions={actions} />
        <AgentToolAdvanced tool={tool} actions={actions} />
      </div>
    </article>
  )
}
