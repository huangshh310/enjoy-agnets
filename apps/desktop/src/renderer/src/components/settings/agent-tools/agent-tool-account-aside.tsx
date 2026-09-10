/**
 * 绑了 Enjoy 档案后的官方登录旁注：保留本机 CLI 登录，不是当前供应商。
 */
import { RiUser3Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function AgentToolAccountAside({
  tool,
  loading
}: {
  tool: AgentToolPublic
  loading?: boolean
}) {
  const t = useT()
  const name =
    tool.authAccount?.email ||
    tool.authAccount?.accountName ||
    (loading ? t("settings.agentTools.accountLoading") : t("settings.agentTools.accountUnknown"))
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-caption-2-medium text-text-tertiary">
      <RiUser3Line className="size-3 shrink-0" />
      <span className="min-w-0 truncate" title={name}>
        {t("settings.agentTools.officialAccountAside", { name })}
      </span>
      <span className="shrink-0">{t("settings.agentTools.officialAccountAsideHint")}</span>
    </p>
  )
}
