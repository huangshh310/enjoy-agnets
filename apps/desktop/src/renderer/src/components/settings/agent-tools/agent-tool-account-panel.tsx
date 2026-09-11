/**
 * 配置抽屉里的官方账号详情。绑了 Enjoy 档案时降为旁注，不把 inspect 当当前供应商。
 */
import { useState } from "react"
import { RiUser3Line } from "@remixicon/react"
import { capabilitiesOf, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { HonestQuotaEmpty } from "./honest-quota-empty"
import { pickQuotaPercent } from "./agent-tool-quota"
import { AgentToolQuotaGrid } from "./agent-tool-account-quota"
import { AgentToolAccountAside } from "./agent-tool-account-aside"
import { officialAccountRole } from "./official-account-role"
import { RateLimitResetsCard } from "./rate-limit-resets-card"
import { SubscriptionQuotaMeter } from "./subscription-quota-meter"
import { UsageTrendSparkline } from "./usage-trend-sparkline"

export function AgentToolAccountPanel({ tool }: { tool: AgentToolPublic }) {
  const role = officialAccountRole(tool)
  if (role === "hidden") return null
  if (role === "aside") return <AgentToolAccountAside tool={tool} />
  return <OfficialAccountHero tool={tool} />
}

function OfficialAccountHero({ tool }: { tool: AgentToolPublic }) {
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
        <Meta
          label={t("settings.agentTools.accountAuthMethod")}
          value={t("settings.agentTools.accountAuthOfficial")}
        />
        <Meta label={t("settings.agentTools.accountOrg")} value={account.organization} />
        <Meta label={t("settings.agentTools.accountCliVersion")} value={account.cliVersion} />
        <Meta label={t("settings.agentTools.accountCurrentModel")} value={account.currentModel} />
      </div>
      {renderQuotaBlock(tool, quotas, showAll, () => setShowAll((v) => !v))}
    </div>
  )
}

function renderQuotaBlock(
  tool: AgentToolPublic,
  quotas: Array<{ name: string; displayName: string; percentage: number; resetsIn: string | null; resetTime: string | null }>,
  showAll: boolean,
  onToggle: () => void
) {
  const quotaInfo = tool.quotaInfo
  const windows = quotaInfo?.windows ?? []
  const hasWindows = windows.length > 0
  const hasResetCredits = Boolean(quotaInfo?.resetCredits?.availableCount)
  const hasSpend = Boolean(quotaInfo?.spend)

  if (!capabilitiesOf(tool).quota && !hasSpend) return <HonestQuotaEmpty reason="no-api" />

  return (
    <div className="space-y-3 pt-1">
      {hasWindows ? (
        <div>
          {windows.map((win) => (
            <SubscriptionQuotaMeter key={win.id || win.name} window={win} />
          ))}
        </div>
      ) : quotas.length > 0 ? (
        <AgentToolQuotaGrid
          pinned={quotas.slice(0, 4)}
          rest={quotas.slice(4)}
          showAll={showAll}
          onToggle={onToggle}
        />
      ) : capabilitiesOf(tool).quota && pickQuotaPercent(quotaInfo, tool.selectedModel) == null ? (
        <HonestQuotaEmpty reason="no-data" />
      ) : null}

      {hasResetCredits && quotaInfo?.resetCredits ? (
        <RateLimitResetsCard resetCredits={quotaInfo.resetCredits} />
      ) : null}

      {hasSpend && quotaInfo?.spend ? (
        <UsageTrendSparkline spend={quotaInfo.spend} />
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
