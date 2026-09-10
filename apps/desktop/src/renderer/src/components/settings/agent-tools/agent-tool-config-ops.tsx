/**
 * 配置弹窗：登录、连通性检查与 doctor 结果。
 * 仅官方助手的登录 CTA 在「这个助手用」槽，这里不再重复。
 */
import { RiLoginBoxLine, RiPulseLine, RiShieldCheckLine } from "@remixicon/react"
import { classifyPowerSource, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { AgentToolOmpLogin } from "./agent-tool-omp-login"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolConfigOps({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  return (
    <>
      {tool.id === "omp" ? (
        <div className="space-y-2">
          <AgentToolOmpLogin tool={tool} actions={actions} />
          <DoctorButton actions={actions} />
        </div>
      ) : classifyPowerSource(tool.id) === "official" ? (
        <DoctorButton actions={actions} />
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3">
          <div className="flex items-center gap-2">
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
            <DoctorButton actions={actions} />
          </div>
        </div>
      )}
      {actions.doctorResult ? <DoctorBanner actions={actions} /> : null}
    </>
  )
}

function DoctorButton({ actions }: { actions: AgentToolActions }) {
  const t = useT()
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={actions.busyAction === "doctor"}
      onClick={() => void actions.runDoctor()}
      className="gap-1.5 text-caption-1-medium"
    >
      <RiShieldCheckLine className="size-3.5 text-text-tertiary" />
      {actions.busyAction === "doctor" ? t("settings.agentTools.checking") : t("settings.agentTools.doctorRun")}
    </Button>
  )
}

function DoctorBanner({ actions }: { actions: AgentToolActions }) {
  const t = useT()
  const result = actions.doctorResult
  if (!result) return null
  return (
    <div className="flex items-start justify-between rounded-xl border border-border-button-default bg-background-secondary-default p-3 font-mono text-caption-2-medium text-text-secondary">
      <div className="flex items-start gap-2">
        <RiPulseLine className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-caption-1-medium text-text-primary">
            {result.ok ? t("settings.agentTools.doctorOk") : t("settings.agentTools.doctorFail")}
          </p>
          <p>{result.message}</p>
        </div>
      </div>
      <button type="button" onClick={() => actions.setDoctorResult(null)} className="text-text-tertiary">
        {t("settings.agentTools.close")}
      </button>
    </div>
  )
}
