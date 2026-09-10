/**
 * 本机 CLI 紧凑表行：助手 | 动力源 | 操作。配置进侧边抽屉。
 */
import { useState } from "react"
import { capabilitiesOf, isCustomAgentId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useQueryClient } from "@tanstack/react-query"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { agentToolCardId } from "./agent-tool-anchor"
import { AgentToolConfigDrawer } from "./agent-tool-config-drawer"
import { AgentToolRowActions, AgentToolRowAssistant } from "./agent-tool-row-parts"
import { CustomAcpAgentDialog } from "./custom-acp-agent-dialog"
import { PowerSourceCell } from "./power-source/power-source-capsule"
import { powerSourcePartsForTool } from "./power-source/resolve-row-source"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolRow({ tool, flash }: { tool: AgentToolPublic; flash?: boolean }) {
  const queryClient = useQueryClient()
  const actions = useAgentToolActions(tool)
  const snapshot = useSettingsSnapshot()
  const custom = isCustomAgentId(tool.id)
  const [configOpen, setConfigOpen] = useState(false)
  const ready = tool.status === "ready" || actions.isDefaultLocal
  const parts = powerSourcePartsForTool(tool, {
    inspecting: snapshot.isInspectingAccounts,
    providers: snapshot.data?.providers,
    defaultModelId: snapshot.data?.defaultModelId
  })
  return (
    <>
      <div
        id={agentToolCardId(tool.id)}
        className={`grid grid-cols-[1.2fr_1.6fr_auto] items-center gap-3 border-b border-separator-border px-4 py-3 last:border-b-0 ${
          flash
            ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
            : actions.isActive
              ? "bg-accent-500/5"
              : ""
        }`}
      >
        <AgentToolRowAssistant tool={tool} actions={actions} ready={ready} />
        <PowerSourceCell
          parts={parts}
          accent={actions.isActive && parts.mode === "vault" && Boolean(parts.archive)}
          quotaHint={parts.mode === "official" && capabilitiesOf(tool).quota}
        />
        <AgentToolRowActions
          tool={tool}
          actions={actions}
          ready={ready}
          onConfigure={() => setConfigOpen(true)}
        />
      </div>
      {custom ? (
        <CustomAcpAgentDialog
          id={tool.id}
          open={configOpen}
          onOpenChange={setConfigOpen}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ["settings"] })}
        />
      ) : (
        <AgentToolConfigDrawer tool={tool} open={configOpen} onOpenChange={setConfigOpen} />
      )}
    </>
  )
}
