/**
 * Studio Zone 2：MCP、Workflows、Automations。
 */
import { RiArrowRightLine, RiFlashlightLine, RiLoader4Line, RiPlugLine, RiRouteLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { Automation, McpServer, WorkflowRun } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function StudioOrchestrationZone({
  mcpServers,
  connectedServers,
  totalMcpTools,
  workflowRuns,
  runningWorkflows,
  automations,
  onOpenMcp,
  onOpenWorkflows,
  onOpenAutomations
}: {
  mcpServers: McpServer[]
  connectedServers: McpServer[]
  totalMcpTools: number
  workflowRuns: WorkflowRun[]
  runningWorkflows: WorkflowRun[]
  automations: Automation[]
  onOpenMcp: () => void
  onOpenWorkflows: () => void
  onOpenAutomations: () => void
}) {
  const t = useT()

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
            <RiRouteLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">{t("studio.orch.title")}</h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">{t("studio.orch.subtitle")}</span>
      </div>
      <div className="grid gap-3.5 md:grid-cols-3">
        <article
          onClick={onOpenMcp}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md md:col-span-2"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                  <RiPlugLine className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                      {t("studio.orch.mcpTitle")}
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      {t("studio.orch.connected", {
                        connected: connectedServers.length,
                        total: mcpServers.length
                      })}
                    </span>
                    <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                      {t("studio.orch.tools", { count: totalMcpTools })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.orch.mcpDesc")}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {mcpServers.length === 0 ? (
                <span className="text-caption-2-medium text-text-tertiary italic">{t("studio.orch.mcpEmpty")}</span>
              ) : (
                mcpServers.slice(0, 4).map((server) => (
                  <div
                    key={server.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium"
                  >
                    <span className={cx("size-1.5 rounded-full", server.connected ? "bg-emerald-500" : "bg-text-tertiary")} />
                    <span className="font-mono font-medium text-text-primary">{server.name}</span>
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase">{server.transport}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">{t("studio.orch.mcpFooter")}</span>
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>{t("studio.orch.manageMcp")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>

        <article
          onClick={onOpenWorkflows}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiRouteLine className="size-5" />
              </div>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  runningWorkflows.length > 0
                    ? "border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
                    : "border border-border-button-default bg-background-secondary-default text-text-secondary"
                )}
              >
                {runningWorkflows.length > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <RiLoader4Line className="size-3 animate-spin" />
                    {t("studio.orch.running", { count: runningWorkflows.length })}
                  </span>
                ) : (
                  t("studio.orch.runs", { count: workflowRuns.length })
                )}
              </span>
            </div>
            <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
              {t("studio.orch.workflowsTitle")}
            </h4>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.orch.workflowsDesc")}</p>
            <div className="mt-3.5 flex items-center gap-1.5 overflow-hidden rounded-xl bg-background-secondary-default p-2 text-[11px]">
              <span className="rounded-md bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                {t("studio.orch.plan")}
              </span>
              <span className="text-text-tertiary">→</span>
              <span className="rounded-md bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                {t("studio.orch.act")}
              </span>
              <span className="text-text-tertiary">→</span>
              <span className="rounded-md bg-background-primary-default px-1.5 py-0.5 font-mono text-text-primary shadow-2xs">
                {t("studio.orch.verify")}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>{t("studio.orch.openWorkflows")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>

        <article
          onClick={onOpenAutomations}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md md:col-span-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiFlashlightLine className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                    {t("studio.orch.autoTitle")}
                  </h4>
                  <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                    {t("studio.orch.activeRules", { count: automations.length })}
                  </span>
                </div>
                <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.orch.autoDesc")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium font-semibold text-accent-600 dark:text-accent-400">
                <RiFlashlightLine className="size-3 text-accent-500" />
                <span>{t("studio.orch.onSaveTriggers")}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 text-caption-2-medium text-text-secondary">
                <span>{t("studio.orch.manualPrompts")}</span>
              </span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">{t("studio.orch.autoFooter")}</span>
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>{t("studio.orch.configureAuto")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>
      </div>
    </section>
  )
}
