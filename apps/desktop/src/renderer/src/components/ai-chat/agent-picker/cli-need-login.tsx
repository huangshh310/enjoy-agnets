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
  onLogin
}: {
  name: string
  kind?: AgentCliLoginKind
  busy: boolean
  hint?: string
  onLogin: () => void
}) {
  const t = useT()
  const need =
    kind === "local"
      ? t("chat.cliProviderNeedLocal")
      : kind === "api_key"
        ? t("chat.cliProviderNeedKey")
        : kind === "device"
          ? t("chat.cliProviderNeedDevice")
          : t("chat.cliProviderNeedLogin")
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-caption-1-medium text-text-secondary">{need}</p>
      <Button type="button" size="sm" disabled={busy} onClick={onLogin}>
        {busy ? t("chat.cliProviderLoggingIn") : t("chat.cliProviderLoginName", { name })}
      </Button>
      {hint ? <p className="text-caption-2-medium text-text-tertiary">{hint}</p> : null}
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
