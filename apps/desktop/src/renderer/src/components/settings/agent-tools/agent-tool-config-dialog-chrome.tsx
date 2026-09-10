/**
 * 智能体配置抽屉顶栏 / 底栏。
 */
import { RiCheckLine, RiCloseLine, RiDeleteBinLine, RiFlashlightLine } from "@remixicon/react"
import { classifyPowerSource, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigHeader({
  tool,
  actions,
  onClose
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  onClose: () => void
}) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-separator-border/60 bg-background-secondary-default/30 px-6 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs">
          <AgentBrandIcon id={tool.id} size={22} />
        </span>
        <div className="min-w-0">
          <h3 id="agent-tool-config-title" className="truncate text-title-3-semibold text-text-primary">
            {t("settings.agentTools.configTitle", { label: tool.label })}
          </h3>
          <p className="mt-0.5 truncate text-caption-1-regular text-text-secondary">
            {configHintFor(tool.id, t)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-3 py-1 text-caption-2-medium text-accent-600">
            <RiCheckLine className="size-3" />
            {t("settings.agentTools.currentEngine")}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actions.busyAction === "activate"}
            onClick={() => void actions.persistRuntime()}
            className="gap-1 text-caption-2-medium"
          >
            <RiFlashlightLine className="size-3 text-accent-500" />
            {t("settings.agentTools.makeActive")}
          </Button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>
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
    <div className="flex shrink-0 items-center justify-between border-t border-separator-border/60 px-6 py-4">
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
