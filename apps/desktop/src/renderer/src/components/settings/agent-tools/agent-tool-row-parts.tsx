/**
 * 本机 CLI 表行：助手格 + 操作格。列表不画路径 / 额度 / 邮箱。
 */
import {
  RiCheckLine,
  RiDownloadCloud2Line,
  RiFileCopyLine,
  RiFlashlightLine,
  RiSettings4Line
} from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { listTaglineKey } from "./power-source/list-tagline"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolRowAssistant({
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
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default">
        <AgentBrandIcon id={tool.id} size={18} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-caption-1-semibold text-text-primary">{tool.label}</p>
          <span className={`size-1.5 shrink-0 rounded-full ${ready ? "bg-notification-success-foreground" : "bg-text-tertiary"}`} />
          <span className="text-caption-2-medium text-text-tertiary">{label}</span>
        </div>
        <p className="truncate text-caption-2-regular text-text-tertiary">{t(listTaglineKey(tool.id))}</p>
      </div>
    </div>
  )
}

export function AgentToolRowActions({
  tool,
  actions,
  ready,
  onConfigure
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
  onConfigure: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-end gap-2">
      <PrimaryAction tool={tool} actions={actions} ready={ready} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onConfigure}
        className="h-8 gap-1 px-2.5 text-caption-2-medium"
      >
        <RiSettings4Line className="size-3.5" />
        {t("settings.agentTools.configure")}
      </Button>
    </div>
  )
}

function PrimaryAction({
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
      <span className="inline-flex h-8 items-center gap-1 rounded-xl bg-accent-500/10 px-2.5 text-caption-2-medium font-medium text-accent-600">
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
        className="h-8 gap-1 px-2.5 text-caption-2-medium"
      >
        <RiFlashlightLine className="size-3 text-accent-500" />
        {t("settings.agentTools.makeActive")}
      </Button>
    )
  }
  if (ready) return null
  return <InstallActions tool={tool} actions={actions} />
}

function InstallActions({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-1.5">
      {tool.installKind !== "copy" ? (
        <Button
          type="button"
          size="sm"
          disabled={actions.busyAction === "install"}
          onClick={() => void actions.runInstall()}
          className="h-8 gap-1 px-2.5 text-caption-2-medium"
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
          className="h-8 gap-1 px-2.5 text-caption-2-medium"
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
