/**
 * 本机 CLI 紧凑表行：助手 | 动力源 | 操作。配置进侧边抽屉。
 */
import { useState } from "react"
import { capabilitiesOf, isCustomAgentId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useQueryClient } from "@tanstack/react-query"
import { engineReadiness } from "@renderer/components/ai-chat/agent-picker/engine-readiness"
import { readinessInputOf } from "@renderer/components/ai-chat/agent-picker/engine-readiness-input"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useCliLoginLoop } from "@renderer/components/ai-chat/agent-picker/cli-login-loop"
import { agentToolCardId } from "./agent-tool-anchor"
import { officialLoginRowPhase } from "./official-login/official-login-phase"
import { AgentToolConfigDrawer } from "./agent-tool-config-drawer"
import { CLI_LIST_GRID } from "./list-layout"
import { AgentToolRowActions, AgentToolRowAssistant } from "./agent-tool-row-parts"
import { CustomAcpAgentDialog } from "./custom-acp-agent-dialog"
import { listRowPhase } from "./list-row-phase"
import { PowerSourceCell } from "./power-source/power-source-capsule"
import { powerSourcePartsForTool } from "./power-source/resolve-row-source"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolRow({ tool, flash }: { tool: AgentToolPublic; flash?: boolean }) {
  const queryClient = useQueryClient()
  const actions = useAgentToolActions(tool)
  const snapshot = useSettingsSnapshot()
  const loginLoop = useCliLoginLoop(tool.id)
  const custom = isCustomAgentId(tool.id)
  const [configOpen, setConfigOpen] = useState(false)
  const pathReady = tool.status === "ready" || actions.isDefaultLocal
  const engineKind = engineReadiness(readinessInputOf(tool))
  const phase = listRowPhase({
    pathReady,
    busy: actions.busyAction,
    installError: actions.installError,
    engineKind
  })
  const loginPhase = officialLoginRowPhase({
    runtimeId: tool.id,
    pathReady,
    canLogin: capabilitiesOf(tool).login,
    loggedIn: tool.authAccount?.loggedIn ?? null,
    inspecting: snapshot.isInspectingAccounts,
    loginLoop: loginLoop.phase
  })
  const parts = powerSourcePartsForTool(tool, {
    inspecting: snapshot.isInspectingAccounts,
    loginLoop: loginLoop.phase,
    providers: snapshot.data?.providers,
    defaultModelId: snapshot.data?.defaultModelId
  })
  return (
    <>
      <div
        id={agentToolCardId(tool.id)}
        className={`grid ${CLI_LIST_GRID} items-center gap-x-3 border-b border-separator-border px-3 py-1.5 last:border-b-0 ${
          flash
            ? "bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
            : actions.isActive
              ? "bg-accent-500/5"
              : ""
        }`}
      >
        <AgentToolRowAssistant
          tool={tool}
          ready={pathReady}
          installPhase={phase}
          installError={actions.installError}
          loginPhase={loginPhase}
          loginReason={loginLoop.reason}
        />
        <PowerSourceCell
          parts={parts}
          accent={actions.isActive && parts.mode === "vault" && Boolean(parts.archive)}
          empty={!pathReady || parts.kind === "none"}
        />
        <AgentToolRowActions
          tool={tool}
          actions={actions}
          ready={pathReady}
          installPhase={phase}
          loginPhase={loginPhase}
          onLogin={() => void actions.runLogin()}
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
