/**
 * 智能体配置弹窗：顶栏 / 滚动区 / 底栏，正文按 Enjoy 本地与 CLI 分流。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { displayLoginMessage } from "@renderer/components/ai-chat/agent-picker/cli-login-hint"
import { useT } from "@renderer/i18n"
import { useState } from "react"
import { AgentToolConfigCli } from "./agent-tool-config-cli"
import { AgentToolConfigFooter, AgentToolConfigHeader } from "./agent-tool-config-dialog-chrome"
import { AgentToolConfigLocal } from "./agent-tool-config-local"
import { useAgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigDialog({
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
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-dialog outline-none"
        >
          <AgentToolConfigHeader tool={tool} actions={actions} onClose={() => onOpenChange(false)} />
          <div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 py-4">
            {actions.feedbackMessage ? (
              <div className="rounded-xl bg-accent-500/10 px-3.5 py-2 text-caption-1-medium text-accent-700">
                {displayLoginMessage(actions.feedbackMessage, t)}
              </div>
            ) : null}
            {actions.isDefaultLocal ? (
              <AgentToolConfigLocal onClose={() => onOpenChange(false)} />
            ) : (
              <AgentToolConfigCli tool={tool} actions={actions} />
            )}
          </div>
          <AgentToolConfigFooter
            tool={tool}
            actions={actions}
            onClose={() => onOpenChange(false)}
            onUninstall={() => setConfirmUninstall(true)}
          />
        </DialogContent>
      </Dialog>
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
