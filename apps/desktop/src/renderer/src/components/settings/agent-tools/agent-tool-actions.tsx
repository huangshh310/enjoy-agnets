/**
 * 智能体卡片行动条：安装、登录、连通性、高级配置开关。
 */
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiDownloadCloud2Line,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiLoginBoxLine,
  RiPulseLine,
  RiSettings4Line,
  RiShieldCheckLine
} from "@remixicon/react"
import type { AgentToolId, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolActionsBar({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator-border pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <InstallButtons tool={tool} actions={actions} />
          <ReadyButtons tool={tool} actions={actions} />
          {tool.needsLoginHint ? (
            <span className="font-mono text-caption-2-medium text-text-secondary">
              {t("settings.agentTools.loginHint", { cmd: tool.needsLoginHint })}
            </span>
          ) : null}
        </div>
        {actions.configurable ? (
          <button
            type="button"
            onClick={() => actions.setShowAdvanced(!actions.showAdvanced)}
            className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary transition-colors hover:text-text-primary"
          >
            <RiSettings4Line className="size-3.5" />
            <span>{t("settings.agentTools.advanced")}</span>
            <RiArrowDownSLine
              className={`size-3.5 transition-transform duration-200 ${actions.showAdvanced ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>
      {actions.feedbackMessage ? (
        <div className="rounded-xl bg-accent-500/10 px-3 py-2 text-caption-2-medium text-accent-700">
          {actions.feedbackMessage}
        </div>
      ) : null}
      <DoctorPanel actions={actions} />
    </>
  )
}

function InstallButtons({ tool, actions }: { tool: AgentToolPublic; actions: AgentToolActions }) {
  const t = useT()
  if (tool.status === "ready" || actions.isDefaultLocal || tool.comingSoon) return null
  return (
    <>
      {tool.installKind !== "copy" ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => void actions.runInstall()}
          className="gap-1.5 text-caption-1-medium"
        >
          <RiDownloadCloud2Line className={`size-3.5 ${actions.busyAction === "install" ? "animate-bounce" : ""}`} />
          {actions.busyAction === "install"
            ? t("settings.agentTools.installing")
            : t("settings.agentTools.installAuto")}
        </Button>
      ) : null}
      {tool.installCommand ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => actions.copyInstallCmd(tool.installCommand)}
          className="gap-1.5 text-caption-1-medium"
        >
          {actions.copiedCommand ? (
            <RiCheckLine className="size-3.5 text-accent-500" />
          ) : (
            <RiFileCopyLine className="size-3.5 text-text-tertiary" />
          )}
          {actions.copiedCommand ? t("settings.agentTools.copied") : t("settings.agentTools.copyOfficial")}
        </Button>
      ) : null}
      {tool.docsUrl ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void getIde().agentTools.openDocs({ id: tool.id as AgentToolId })}
          className="gap-1.5 text-caption-1-medium"
        >
          <RiExternalLinkLine className="size-3.5 text-text-tertiary" />
          {t("settings.agentTools.docs")}
        </Button>
      ) : null}
    </>
  )
}

function ReadyButtons({ tool, actions }: { tool: AgentToolPublic; actions: AgentToolActions }) {
  const t = useT()
  if (actions.isDefaultLocal || tool.status !== "ready") return null
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actions.busyAction === "login"}
        onClick={() => void actions.runLogin()}
        className="gap-1.5 text-caption-1-medium"
      >
        <RiLoginBoxLine className="size-3.5 text-text-tertiary" />
        {actions.busyAction === "login" ? t("settings.agentTools.loggingIn") : t("settings.agentTools.login")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actions.busyAction === "doctor"}
        onClick={() => void actions.runDoctor()}
        className="gap-1.5 text-caption-1-medium"
      >
        <RiShieldCheckLine
          className={`size-3.5 ${actions.busyAction === "doctor" ? "animate-spin text-accent-500" : "text-text-tertiary"}`}
        />
        {actions.busyAction === "doctor" ? t("settings.agentTools.checking") : t("settings.agentTools.doctorRun")}
      </Button>
    </>
  )
}

function DoctorPanel({ actions }: { actions: AgentToolActions }) {
  const t = useT()
  if (!actions.doctorResult) return null
  const ok = actions.doctorResult.ok
  return (
    <div
      className={`flex items-start justify-between rounded-xl border p-3 font-mono text-caption-2-medium ${
        ok
          ? "border-accent-500/30 bg-accent-500/5 text-accent-700"
          : "border-border-button-default bg-background-secondary-default text-text-secondary"
      }`}
    >
      <div className="flex items-start gap-2">
        <RiPulseLine className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold">{ok ? t("settings.agentTools.doctorOk") : t("settings.agentTools.doctorFail")}</p>
          <p className="opacity-90">{actions.doctorResult.message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => actions.setDoctorResult(null)}
        className="text-caption-2-medium text-text-tertiary hover:text-text-primary"
      >
        {t("settings.agentTools.close")}
      </button>
    </div>
  )
}
