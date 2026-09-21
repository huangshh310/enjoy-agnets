/**
 * 本机 CLI 操作列：定宽主槽 + 图标次钮。安装中禁用；失败主槽改重试。
 */
import { RiCheckLine, RiFileCopyLine, RiSettings4Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { CLI_LIST_ICON_SLOT, CLI_LIST_PRIMARY_SLOT } from "./list-layout"
import type { InstallRowPhase } from "./install-row-copy"
import {
  overridesOfficialListReady,
  showsOfficialConfigure,
  type OfficialLoginRowPhase
} from "./official-login/official-login-phase"
import { OfficialLoginPrimary } from "./official-login/official-login-primary"
import { canUpdateCli, isCliOutdated } from "./cli-outdated/cli-outdated-copy"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolRowActions({
  tool,
  actions,
  ready,
  installPhase,
  loginPhase = "idle",
  onLogin,
  onConfigure
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
  installPhase: InstallRowPhase
  loginPhase?: OfficialLoginRowPhase
  onLogin?: () => void
  onConfigure: () => void
}) {
  const t = useT()
  const installing = installPhase === "installing"
  const secondary = ready && showsOfficialConfigure(loginPhase) ? (
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
      disabled={installing}
      onClick={() => actions.copyInstallCmd(tool.installCommand)}
      title={t("settings.agentTools.listCopy")}
      aria-label={t("settings.agentTools.listCopy")}
      className={`${CLI_LIST_ICON_SLOT} p-0 ${installing ? "opacity-40" : ""}`}
    >
      <RiFileCopyLine className="size-3.5 text-text-tertiary" />
    </Button>
  ) : null
  return (
    <div className="flex items-center justify-end gap-1">
      <PrimarySlot
        tool={tool}
        actions={actions}
        ready={ready}
        installPhase={installPhase}
        loginPhase={loginPhase}
        onLogin={onLogin}
      />
      {secondary}
    </div>
  )
}

function PrimarySlot({
  tool,
  actions,
  ready,
  installPhase,
  loginPhase,
  onLogin
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
  installPhase: InstallRowPhase
  loginPhase: OfficialLoginRowPhase
  onLogin?: () => void
}) {
  const t = useT()
  if (overridesOfficialListReady(loginPhase)) {
    return <OfficialLoginPrimary phase={loginPhase} onLogin={onLogin} />
  }
  if (canUpdateCli(tool) || (ready && actions.busyAction === "install")) {
    const installing = actions.busyAction === "install" || installPhase === "installing"
    return (
      <Button
        type="button"
        size="sm"
        disabled={installing}
        onClick={() => void actions.runInstall()}
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium`}
      >
        {installing ? t("settings.agentTools.listUpdating") : t("settings.agentTools.listUpdate")}
      </Button>
    )
  }
  if (isCliOutdated(tool)) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium opacity-50`}
      >
        {t("settings.agentTools.makeActive")}
      </Button>
    )
  }
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
  if (installPhase === "inspecting") {
    return (
      <Button
        type="button"
        size="sm"
        disabled
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium opacity-90`}
      >
        {t("settings.agentTools.inspectingStatus")}
      </Button>
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
    const failed = installPhase === "failed"
    const installing = installPhase === "installing"
    return (
      <Button
        type="button"
        size="sm"
        variant={failed ? "outline" : "default"}
        disabled={installing}
        onClick={() => void actions.runInstall()}
        className={`${CLI_LIST_PRIMARY_SLOT} px-2 text-caption-2-medium ${
          failed ? "border-border-error-default text-text-error-primary" : ""
        } ${installing ? "opacity-90" : ""}`}
      >
        {installing
          ? t("settings.agentTools.installing")
          : failed
            ? t("settings.agentTools.installRetry")
            : t("settings.agentTools.install")}
      </Button>
    )
  }
  return <span className={CLI_LIST_PRIMARY_SLOT} />
}
