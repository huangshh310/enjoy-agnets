/**
 * OpenUsage 密度：额度条 + 迷你趋势 + 今日/昨日/30 天 + 外链。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiSettings4Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useT } from "@renderer/i18n"
import { formatSpendLine } from "./format-spend"
import { RateLimitResetsCard } from "./rate-limit-resets-card"
import { SubscriptionQuotaMeter } from "./subscription-quota-meter"
import { UsageTrendSparkline } from "./usage-trend-sparkline"

const PROVIDER_LINKS: Record<string, { label: string; href: string }[]> = {
  cursor: [
    { label: "Status", href: "https://cursor.com/dashboard" },
    { label: "Dashboard", href: "https://cursor.com/dashboard?tab=usage" }
  ],
  grok: [{ label: "Usage", href: "https://grok.com" }],
  claude: [{ label: "Usage", href: "https://claude.ai/settings/usage" }],
  codex: [{ label: "Usage", href: "https://chatgpt.com" }]
}

export function AgentSubscriptionCard({
  tool,
  showLeft,
  onToggleLeft,
  showExactReset,
  onToggleExact,
  onConfigure
}: {
  tool: AgentToolPublic
  showLeft: boolean
  onToggleLeft: () => void
  showExactReset: boolean
  onToggleExact: () => void
  onConfigure?: (toolId: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const quota = tool.quotaInfo
  const windows = quota?.windows ?? []
  const alwaysWindows = windows.filter((item) => !isDemandWindow(item.id, item.windowType))
  const demandWindows = windows.filter((item) => isDemandWindow(item.id, item.windowType))
  const spend = quota?.spend
  const links = PROVIDER_LINKS[tool.id] ?? []

  return (
    <section className="flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default px-4 py-3">
      <header className="mb-1 flex items-center gap-2">
        <AgentBrandIcon id={tool.id} size={16} />
        <span className="min-w-0 truncate text-body-medium text-text-primary">{tool.label}</span>
        {tool.authAccount?.tier ? (
          <span className="truncate text-caption-2-medium text-text-tertiary">{tool.authAccount.tier}</span>
        ) : null}
        {onConfigure ? (
          <button
            type="button"
            className="ml-auto flex size-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
            onClick={() => onConfigure(tool.id)}
            title={t("settings.agentTools.configure")}
          >
            <RiSettings4Line className="size-3.5" />
          </button>
        ) : (
          <span className="ml-auto" />
        )}
      </header>

      {alwaysWindows.map((item) => (
        <SubscriptionQuotaMeter
          key={item.id || item.name}
          window={item}
          showLeft={showLeft}
          onToggleLeft={onToggleLeft}
          showExactReset={showExactReset}
          onToggleExact={onToggleExact}
        />
      ))}

      {quota?.resetCredits ? <RateLimitResetsCard resetCredits={quota.resetCredits} /> : null}
      {spend?.trend30Days?.length ? <UsageTrendSparkline spend={spend} /> : null}

      {demandWindows.length > 0 ? (
        <button
          type="button"
          className="flex w-full items-center justify-center py-1 text-text-tertiary"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <RiArrowDownSLine className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : null}
      {open
        ? demandWindows.map((item) => (
            <SubscriptionQuotaMeter
              key={item.id || item.name}
              window={item}
              showLeft={showLeft}
              onToggleLeft={onToggleLeft}
              showExactReset={showExactReset}
              onToggleExact={onToggleExact}
            />
          ))
        : null}

      <SpendRow label={t("settings.subscriptions.todayRow")} value={formatSpendLine(spend?.today?.costUsd, spend?.today?.tokens)} />
      <SpendRow
        label={t("settings.subscriptions.yesterdayRow")}
        value={formatSpendLine(spend?.yesterday?.costUsd, spend?.yesterday?.tokens)}
      />
      <SpendRow
        label={t("settings.subscriptions.last30Row")}
        value={formatSpendLine(spend?.last30Days?.costUsd, spend?.last30Days?.tokens)}
      />

      {links.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border-button-default px-3 py-1 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function isDemandWindow(_id: string, windowType?: string) {
  return windowType === "other"
}

function SpendRow({ label, value }: { label: string; value: string | null }) {
  const t = useT()
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-caption-2-medium">
      <span className="text-text-primary">{label}</span>
      <span className="tabular-nums text-text-primary">{value ?? t("settings.subscriptions.noData")}</span>
    </div>
  )
}
