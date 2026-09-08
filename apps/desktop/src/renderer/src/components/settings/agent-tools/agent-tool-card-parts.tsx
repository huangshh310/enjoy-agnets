/**
 * 智能体卡片头尾与主操作。
 */
import {
  RiCheckLine,
  RiDeleteBinLine,
  RiDownloadCloud2Line,
  RiFileCopyLine,
  RiFlashlightLine,
  RiSettings4Line
} from "@remixicon/react"
import { isCustomAgentId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolCardHead({
  tool,
  actions,
  ready
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
}) {
  const t = useT()
  const label = ready
    ? t("settings.agentTools.statusReady")
    : tool.comingSoon
      ? t("settings.agentTools.statusSoon")
      : tool.skillOnly
        ? t("settings.agentTools.statusSkill")
        : t("settings.agentTools.statusMissing")
  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default">
          <AgentBrandIcon id={tool.id} size={20} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-body-medium text-text-primary">{tool.label}</h4>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 text-caption-2-medium ${
                ready ? "bg-accent-500/10 text-accent-600" : "bg-background-secondary-default text-text-secondary"
              }`}
            >
              <span className={`size-1 rounded-full ${ready ? "bg-accent-500" : "bg-text-tertiary"}`} />
              {label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-caption-2-regular text-text-secondary">{actions.meta.tagline}</p>
        </div>
      </div>
      {actions.configurable ? (
        <Switch
          checked={tool.enabled}
          onCheckedChange={(enabled) => void actions.persist({ enabled })}
          aria-label={t("settings.agentTools.enabled")}
        />
      ) : null}
    </div>
  )
}

export function AgentToolCardFoot({
  tool,
  actions,
  ready,
  onConfigure,
  onUninstall
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
  onConfigure: () => void
  onUninstall: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-2 border-t border-separator-border/60 pt-2.5">
      <AgentToolCardPrimary tool={tool} actions={actions} ready={ready} />
      <div className="flex items-center gap-1">
        {actions.configurable && (isCustomAgentId(tool.id) || (ready && tool.installKind !== "copy")) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={actions.busyAction === "uninstall"}
            onClick={onUninstall}
            className="h-7 gap-1 px-1.5 text-caption-2-medium text-text-tertiary hover:text-text-error-primary"
          >
            <RiDeleteBinLine className="size-3" />
            {actions.busyAction === "uninstall"
              ? t("settings.agentTools.uninstalling")
              : isCustomAgentId(tool.id)
                ? t("settings.registry.deleteCustom")
                : t("settings.agentTools.uninstall")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onConfigure}
          className="h-7 gap-1 px-2 text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          <RiSettings4Line className="size-3.5" />
          {t("settings.agentTools.configure")}
        </Button>
      </div>
    </div>
  )
}

function AgentToolCardPrimary({
  tool,
  actions,
  ready
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
}) {
  const t = useT()
  if (actions.isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-caption-2-medium text-accent-600">
        <RiCheckLine className="size-3.5" />
        {t("settings.agentTools.currentEngine")}
      </span>
    )
  }
  if (ready && tool.enabled) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actions.busyAction === "activate"}
        onClick={() => void actions.persistRuntime()}
        className="h-7 gap-1 px-2 text-caption-2-medium hover:border-accent-500/50"
      >
        <RiFlashlightLine className="size-3 text-accent-500" />
        {t("settings.agentTools.makeActive")}
      </Button>
    )
  }
  if (ready) return null
  return (
    <div className="flex items-center gap-1.5">
      {tool.installKind !== "copy" ? (
        <Button
          type="button"
          size="sm"
          disabled={actions.busyAction === "install"}
          onClick={() => void actions.runInstall()}
          className="h-7 gap-1 px-2 text-caption-2-medium"
        >
          <RiDownloadCloud2Line className="size-3" />
          {actions.busyAction === "install" ? t("settings.agentTools.installing") : t("settings.agentTools.install")}
        </Button>
      ) : null}
      {tool.installCommand ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => actions.copyInstallCmd(tool.installCommand)}
          className="h-7 gap-1 px-2 text-caption-2-medium"
        >
          <RiFileCopyLine className="size-3 text-text-tertiary" />
          {actions.copiedCommand ? t("settings.agentTools.copied") : t("settings.agentTools.copyCommand")}
        </Button>
      ) : (
        <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.comingSoonShort")}</span>
      )}
    </div>
  )
}
