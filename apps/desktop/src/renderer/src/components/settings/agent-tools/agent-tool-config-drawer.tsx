/**
 * 智能体配置侧边抽屉：对标知识库文档预览，右侧滑出。
 */
import { useState } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { displayLoginMessage } from "@renderer/components/ai-chat/agent-picker/cli-login-hint"
import { useT } from "@renderer/i18n"
import { SettingsSideDrawer } from "../settings-side-drawer"
import { AgentToolConfigCli } from "./agent-tool-config-cli"
import { AgentToolConfigFooter, AgentToolConfigHeader } from "./agent-tool-config-dialog-chrome"
import { AGENT_CONFIG_DRAWER_WIDTH_CLASS } from "./agent-tool-constants"
import { AgentToolConfigLocal } from "./agent-tool-config-local"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigDrawer({
  tool,
  open,
  onOpenChange
}: {
  tool: AgentToolPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const actions = useAgentToolActions(tool)
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const close = () => onOpenChange(false)

  return (
    <>
      <SettingsSideDrawer
        open={open}
        onClose={close}
        labelledBy="agent-tool-config-title"
        closeLabel={t("settings.agentTools.close")}
        widthClass={AGENT_CONFIG_DRAWER_WIDTH_CLASS}
      >
        <AgentToolConfigHeader tool={tool} actions={actions} onClose={close} />
        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4">
          {actions.feedbackMessage ? (
            <div className="rounded-2xl bg-accent-500/10 px-3.5 py-2 text-caption-1-medium text-accent-700">
              {displayLoginMessage(actions.feedbackMessage, t)}
            </div>
          ) : null}
          {actions.isDefaultLocal ? (
            <AgentToolConfigLocal tool={tool} onClose={close} />
          ) : (
            <AgentToolConfigCli tool={tool} actions={actions} />
          )}
        </div>
        <AgentToolConfigFooter
          tool={tool}
          actions={actions}
          onClose={close}
          onUninstall={() => setConfirmUninstall(true)}
        />
      </SettingsSideDrawer>
      <ConfirmDialog
        open={confirmUninstall}
        title={t("settings.agentTools.uninstallTitle", { label: tool.label })}
        description={t("settings.agentTools.uninstallDesc")}
        confirmLabel={t("settings.agentTools.uninstall")}
        destructive
        onOpenChange={setConfirmUninstall}
        onConfirm={() => void actions.runUninstall()}
      />
    </>
  )
}
