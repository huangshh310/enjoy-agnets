/**
 * 智能体紧凑卡片：状态、安装、设为主引擎；配置进弹窗。
 */
import { useState } from "react"
import { RiTerminalBoxLine } from "@remixicon/react"
import { isCustomAgentId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
import { agentToolCardId } from "./agent-tool-anchor"
import { AgentToolAccountRow } from "./agent-tool-account-row"
import { AgentToolCardFoot, AgentToolCardHead } from "./agent-tool-card-parts"
import { AgentToolConfigDialog } from "./agent-tool-config-dialog"
import { CustomAcpAgentDialog } from "./custom-acp-agent-dialog"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolCard({ tool, flash }: { tool: AgentToolPublic; flash?: boolean }) {
  const t = useT()
  const queryClient = useQueryClient()
  const actions = useAgentToolActions(tool)
  const inspecting = useSettingsSnapshot().isInspectingAccounts
  const custom = isCustomAgentId(tool.id)
  const [configOpen, setConfigOpen] = useState(false)
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const ready = tool.status === "ready" || actions.isDefaultLocal
  const source = tool.detectedPath
    ? tool.detectedPath.split("/").slice(-2).join("/")
    : actions.isDefaultLocal
      ? t("settings.agentTools.builtinRuntime")
      : t("settings.agentTools.globalPath")

  return (
    <>
      <article
        id={agentToolCardId(tool.id)}
        className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
          flash
            ? "border-accent-500/50 bg-background-primary-default shadow-card ring-2 ring-accent-500/35"
            : actions.isActive
              ? "border-accent-500/50 bg-background-primary-default shadow-card ring-1 ring-accent-500/25"
              : ready
                ? "border-border-button-default bg-background-primary-default shadow-2xs hover:border-border-button-hover"
                : "border-dashed border-border-button-default/80 bg-background-secondary-default/30 opacity-80"
        }`}
      >
        <AgentToolCardHead tool={tool} actions={actions} ready={ready} />
        <div className="my-2 flex flex-col gap-1.5 rounded-lg bg-background-secondary-default/40 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-mono text-caption-2-medium text-text-tertiary">
              <RiTerminalBoxLine className="size-3.5 shrink-0" />
              <span className="max-w-[160px] truncate" title={tool.detectedPath ?? source}>
                {source}
              </span>
            </span>
            <span className="truncate font-mono text-caption-2-medium text-text-secondary" title={tool.selectedModel}>
              {tool.models.find((item) => item.id === tool.selectedModel)?.label ??
                tool.selectedModel ??
                (actions.isDefaultLocal ? t("settings.agentTools.model") : "")}
            </span>
          </div>
          <AgentToolAccountRow tool={tool} loading={Boolean(inspecting && !tool.authAccount)} />
        </div>
        <AgentToolCardFoot
          tool={tool}
          actions={actions}
          ready={ready}
          onConfigure={() => setConfigOpen(true)}
          onUninstall={() => setConfirmUninstall(true)}
        />
      </article>
      {custom ? (
        <CustomAcpAgentDialog
          id={tool.id}
          open={configOpen}
          onOpenChange={setConfigOpen}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ["settings"] })}
        />
      ) : (
        <AgentToolConfigDialog tool={tool} open={configOpen} onOpenChange={setConfigOpen} />
      )}
      <ConfirmDialog
        open={confirmUninstall}
        title={
          custom
            ? t("settings.registry.deleteTitle")
            : t("settings.agentTools.uninstallTitle", { label: tool.label })
        }
        description={custom ? t("settings.registry.deleteDesc") : t("settings.agentTools.uninstallDesc")}
        confirmLabel={custom ? t("settings.registry.deleteCustom") : t("settings.agentTools.uninstall")}
        destructive
        onOpenChange={setConfirmUninstall}
        onConfirm={() =>
          void (custom ? removeCustomCard(tool.id, queryClient) : actions.runUninstall())
        }
      />
    </>
  )
}

async function removeCustomCard(
  id: string,
  queryClient: ReturnType<typeof useQueryClient>
) {
  if (!hasIde()) return
  await getIde().agentTools.removeCustom({ id })
  await queryClient.invalidateQueries({ queryKey: ["settings"] })
}
