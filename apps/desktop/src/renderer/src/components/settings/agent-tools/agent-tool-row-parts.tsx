/**
 * 本机 CLI 表行：助手格（品牌 / 已同步 / 状态点 / 次行）+ 定宽操作槽。
 */
import { RiCheckLine, RiFileCopyLine, RiSettings4Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { CLI_LIST_ICON_SLOT, CLI_LIST_PRIMARY_SLOT } from "./list-layout"
import { formatListSecondary } from "./list-secondary"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolRowAssistant({
  tool,
  ready
}: {
  tool: AgentToolPublic
  ready: boolean
}) {
  const t = useT()
  const planned = tool.comingSoon || tool.skillOnly
  const status = ready
    ? t("settings.agentTools.statusReady")
    : planned
      ? t("settings.agentTools.filterSoon")
      : t("settings.agentTools.statusMissing")
  const secondary = formatListSecondary(tool, t)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
          ready ? "bg-background-secondary-default" : "border border-dashed border-border-button-default"
        }`}
      >
        <AgentBrandIcon id={tool.id} size={16} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-caption-1-semibold text-text-primary">{tool.label}</p>
          {tool.homeSynced ? (
            <span className="rounded bg-accent-500/10 px-1 text-caption-2-medium text-accent-600">
              {t("settings.agentTools.listSynced")}
            </span>
          ) : null}
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              ready
                ? "bg-notification-success-foreground"
                : planned
                  ? "bg-text-tertiary"
                  : "bg-state-warning-text"
            }`}
          />
          <span
            className={`shrink-0 text-caption-2-medium ${
              ready || planned ? "text-text-tertiary" : "text-state-warning-text"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="truncate font-mono text-caption-2-regular text-text-tertiary" title={secondary}>
          {secondary}
        </p>
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
  const secondary = ready ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onConfigure}
      title={t("settings.agentTools.configure")}
      aria-label={t("settings.agentTools.configure")}
      className={`${CLI_LIST_ICON_SLOT} p-0`}
    >
      <RiSettings4Line className="size-3.5 text-text-tertiary" />
    </Button>
  ) : tool.installCommand ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => actions.copyInstallCmd(tool.installCommand)}
      title={t("settings.agentTools.listCopy")}
      aria-label={t("settings.agentTools.listCopy")}
      className={`${CLI_LIST_ICON_SLOT} p-0`}
    >
      <RiFileCopyLine className="size-3.5 text-text-tertiary" />
    </Button>
  ) : null
  return (
    <div className="flex items-center justify-end gap-1">
      <PrimarySlot tool={tool} actions={actions} ready={ready} />
      {secondary}
    </div>
  )
}

function PrimarySlot({
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
      <span
        className={`${CLI_LIST_PRIMARY_SLOT} inline-flex items-center justify-center rounded-lg bg-accent-500/10 text-caption-2-medium font-medium text-accent-600`}
      >
        <RiCheckLine className="size-3.5" />
        {t("settings.agentTools.listCurrent")}
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
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium`}
      >
        {t("settings.agentTools.makeActive")}
      </Button>
    )
  }
  if (ready) return <span className={CLI_LIST_PRIMARY_SLOT} />
  if (tool.installKind !== "copy") {
    return (
      <Button
        type="button"
        size="sm"
        disabled={actions.busyAction === "install"}
        onClick={() => void actions.runInstall()}
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium`}
      >
        {actions.busyAction === "install" ? t("settings.agentTools.installing") : t("settings.agentTools.install")}
      </Button>
    )
  }
  return <span className={CLI_LIST_PRIMARY_SLOT} />
}
