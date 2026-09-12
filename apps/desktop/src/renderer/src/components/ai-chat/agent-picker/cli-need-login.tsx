/**
 * 未登录供应商的右栏：按 loginKind 给提示；自定义不画登录。
 */
import type { AgentCliLoginKind } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function CliNeedLogin({
  name,
  kind,
  busy,
  hint,
  inspecting,
  authorizing,
  failed,
  onLogin
}: {
  name: string
  kind?: AgentCliLoginKind
  busy: boolean
  hint?: string
  inspecting?: boolean
  authorizing?: boolean
  failed?: boolean
  onLogin: () => void
}) {
  const t = useT()
  const need = inspecting
    ? t("chat.agentInspecting")
    : authorizing
      ? t("chat.agentAuthorizing")
      : failed
        ? t("chat.agentLoginFailed")
        : kind === "local"
          ? t("chat.cliProviderNeedLocal")
          : kind === "api_key"
            ? t("chat.cliProviderNeedKey")
            : kind === "device"
              ? t("chat.cliProviderNeedDevice")
              : t("chat.cliProviderNeedLogin")
  const action = authorizing
    ? t("settings.agentTools.officialWaitAuth")
    : failed
      ? t("settings.agentTools.officialRetryAuth")
      : busy
        ? t("chat.cliProviderLoggingIn")
        : t("chat.cliProviderLoginName", { name })
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <p className="text-caption-1-medium text-text-secondary">{need}</p>
      <Button type="button" size="sm" disabled={busy || authorizing || inspecting} onClick={onLogin}>
        {action}
      </Button>
      {hint ? (
        <p
          className={`text-caption-2-medium ${failed ? "text-text-error-primary" : "text-text-tertiary"}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function CliCustomNeedConfig() {
  const t = useT()
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-caption-1-medium text-text-secondary">{t("chat.cliCustomNeedConfig")}</p>
    </div>
  )
}
