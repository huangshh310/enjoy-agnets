/**
 * 智能体配置抽屉顶栏 / 底栏。顶栏对齐预览：名称 + 配置提示 + 关闭。
 */
import { RiDeleteBinLine } from "@remixicon/react"
import { classifyPowerSource, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigHeader({
  tool,
  onClose
}: {
  tool: AgentToolPublic
  actions?: AgentToolActions
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-separator-border px-4 py-3">
      <div className="min-w-0">
        <h3 id="agent-tool-config-title" className="truncate text-body-medium font-semibold text-text-primary">
          {tool.label}
        </h3>
        <p className="mt-0.5 truncate text-caption-2-regular text-text-tertiary">{configHintFor(tool.id, t)}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-caption-1-medium text-text-tertiary hover:text-text-primary"
      >
        {t("settings.agentTools.close")}
      </button>
    </div>
  )
}

export function AgentToolConfigFooter({
  tool,
  actions,
  onClose,
  onUninstall
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  onClose: () => void
  onUninstall: () => void
}) {
  const t = useT()
  const canUninstall = !actions.isDefaultLocal && tool.status === "ready" && tool.installKind !== "copy"
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-separator-border px-4 py-3">
      <div>
        {canUninstall ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={actions.busyAction === "uninstall"}
            onClick={onUninstall}
            className="gap-1.5 text-caption-1-medium text-text-error-primary hover:bg-text-error-primary/10"
          >
            <RiDeleteBinLine className="size-3.5" />
            {actions.busyAction === "uninstall"
              ? t("settings.agentTools.uninstalling")
              : t("settings.agentTools.uninstall")}
          </Button>
        ) : null}
      </div>
      <Button type="button" size="sm" onClick={onClose}>
        {t("settings.agentTools.done")}
      </Button>
    </div>
  )
}

function configHintFor(runtimeId: string, t: (key: string) => string): string {
  const kind = classifyPowerSource(runtimeId)
  if (kind === "bindable") return t("settings.agentTools.configBindableHint")
  if (kind === "omp") return t("settings.agentTools.configOmpHint")
  if (kind === "enjoy-vault") return t("settings.agentTools.configVaultHint")
  return t("settings.agentTools.configOfficialHint")
}
