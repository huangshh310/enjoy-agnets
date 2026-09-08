/**
 * 配置弹窗里的账号详情与模型额度。数字只来自官方 CLI / 公开配额文件。
 */
import { useState } from "react"
import { RiTimeLine, RiUser3Line } from "@remixicon/react"
import { capabilitiesOf, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolQuotaGrid } from "./agent-tool-account-quota"

export function AgentToolAccountPanel({ tool }: { tool: AgentToolPublic }) {
  const t = useT()
  const [showAll, setShowAll] = useState(false)
  const account = tool.authAccount
  if (!account) return null
  const quotas = tool.quotaInfo?.modelQuotas ?? []
  return (
    <div className="space-y-3 rounded-xl border border-border-button-default bg-background-secondary-default/40 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default">
            <RiUser3Line className="size-3.5 text-accent-500" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-medium text-text-primary">
              {account.email || account.accountName || t("settings.agentTools.accountUnknown")}
            </p>
            {account.tier ? (
              <span className="font-mono text-caption-2-medium text-accent-600">{account.tier}</span>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-2-medium ${
            account.loggedIn ? "bg-accent-500/10 text-accent-600" : "bg-background-secondary-default text-text-secondary"
          }`}
        >
          <span className={`size-1.5 rounded-full ${account.loggedIn ? "bg-accent-500" : "bg-text-tertiary"}`} />
          {account.loggedIn ? t("settings.agentTools.accountSignedIn") : t("settings.agentTools.accountNeedsLogin")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-separator-border/60 pt-2.5 text-caption-2-medium">
        <Meta label={t("settings.agentTools.accountAuthMethod")} value={account.authMethod} />
        <Meta label={t("settings.agentTools.accountOrg")} value={account.organization} />
        <Meta label={t("settings.agentTools.accountCliVersion")} value={account.cliVersion} />
        <Meta label={t("settings.agentTools.accountCurrentModel")} value={account.currentModel} />
      </div>
      {capabilitiesOf(tool).quota && tool.quotaInfo && quotas.length === 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border-button-default/40 bg-background-primary-default/60 px-2.5 py-1.5 text-caption-2-medium">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <RiTimeLine className="size-3.5 text-text-tertiary" />
            {tool.quotaInfo.windowType || t("settings.agentTools.quotaNone")}
          </span>
          <span className="truncate font-mono text-text-tertiary" title={tool.quotaInfo.details}>
            {tool.quotaInfo.details}
          </span>
        </div>
      ) : null}
      {capabilitiesOf(tool).quota && quotas.length > 0 ? (
        <AgentToolQuotaGrid
          pinned={quotas.slice(0, 4)}
          rest={quotas.slice(4)}
          showAll={showAll}
          onToggle={() => setShowAll((v) => !v)}
        />
      ) : null}
    </div>
  )
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <span className="block text-text-tertiary">{label}</span>
      <span className="mt-0.5 block truncate font-mono text-text-secondary" title={value}>
        {value}
      </span>
    </div>
  )
}
