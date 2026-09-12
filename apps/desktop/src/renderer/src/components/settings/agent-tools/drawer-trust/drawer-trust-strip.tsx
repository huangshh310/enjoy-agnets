/**
 * 配置抽屉顶栏信任卡：健康一行 + 用量一行，贴在「这个助手用」之前。
 */
import { capabilitiesOf, type AgentToolId, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { cliCompatOf, formatTrustOutdated, isCliOutdated } from "../cli-outdated/cli-outdated-copy"
import type { AgentToolActions } from "../use-agent-tool-actions"
import { resolveTrustHealth, resolveTrustUsage } from "./drawer-trust-copy"
import type { TrustHealthView, TrustUsageView } from "./drawer-trust.types"

export function DrawerTrustStrip({
  tool,
  actions,
  onViewUsage
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  onViewUsage: () => void
}) {
  const t = useT()
  const outdated = isCliOutdated(tool)
  const health = resolveTrustHealth({
    checking: actions.busyAction === "doctor",
    result: actions.doctorResult,
    ranAt: actions.doctorRanAt,
    now: Date.now(),
    t,
    outdatedLabel: outdated ? formatTrustOutdated(cliCompatOf(tool), t) : null
  })
  const usage = resolveTrustUsage({
    quota: capabilitiesOf(tool).quota,
    quotaInfo: tool.quotaInfo,
    selectedModel: tool.selectedModel,
    t
  })
  return (
    <section className="overflow-hidden rounded-xl border border-border-button-default">
      <HealthRow health={health} onRun={() => void actions.runDoctor()} />
      {health.kind === "outdated" ? (
        <UpdateCtaRow
          tool={tool}
          onCopy={() => actions.copyInstallCmd(tool.installCommand)}
        />
      ) : null}
      <UsageRow usage={usage} onView={onViewUsage} />
    </section>
  )
}

function HealthRow({ health, onRun }: { health: TrustHealthView; onRun: () => void }) {
  const t = useT()
  const cta = t("settings.agentTools.trustRunDoctor")
  const hideDoctor = health.kind === "outdated"
  return (
    <div className="flex items-center gap-2 border-b border-border-button-default px-3 py-2">
      <span className="w-8 shrink-0 text-caption-2-medium text-text-tertiary">
        {t("settings.agentTools.trustHealth")}
      </span>
      <span className={`size-1.5 shrink-0 rounded-full ${health.dotClass}`} />
      <span className={`min-w-0 flex-1 truncate text-caption-1-medium ${health.textClass}`} title={health.title}>
        {health.label}
      </span>
      {hideDoctor ? null : health.ctaDisabled ? (
        <span className="shrink-0 text-caption-2-medium text-text-tertiary">{cta}</span>
      ) : (
        <button
          type="button"
          onClick={onRun}
          className="shrink-0 text-caption-2-medium text-accent-600 hover:underline"
        >
          {cta}
        </button>
      )}
    </div>
  )
}

function UpdateCtaRow({
  tool,
  onCopy
}: {
  tool: AgentToolPublic
  onCopy: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-end gap-3 border-b border-border-button-default px-3 py-2">
      <button
        type="button"
        onClick={() => {
          if (!hasIde()) return
          void getIde().agentTools.openDocs({ id: tool.id as AgentToolId })
        }}
        className="text-caption-2-medium font-medium text-accent-600 hover:underline"
      >
        {t("settings.agentTools.trustViewUpdateDocs")}
      </button>
      {tool.installCommand ? (
        <button
          type="button"
          onClick={onCopy}
          className="text-caption-2-medium font-medium text-accent-600 hover:underline"
        >
          {t("settings.agentTools.trustCopyUpdateCmd")}
        </button>
      ) : null}
    </div>
  )
}

function UsageRow({ usage, onView }: { usage: TrustUsageView; onView: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="w-8 shrink-0 text-caption-2-medium text-text-tertiary">
        {t("settings.agentTools.trustUsage")}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-caption-1-medium ${
          usage.kind === "empty" ? "text-text-tertiary" : "text-text-primary"
        }`}
        title={usage.label}
      >
        {usage.label}
      </span>
      {usage.showDetail ? (
        <button
          type="button"
          onClick={onView}
          className="shrink-0 text-caption-2-medium text-accent-600 hover:underline"
        >
          {t("settings.agentTools.trustUsageDetail")}
        </button>
      ) : null}
    </div>
  )
}
