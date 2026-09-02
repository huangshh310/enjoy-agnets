/**
 * Studio Hero：标题、Local-First 状态、四格 live 指标。
 */
import { RiBookOpenLine, RiFlashlightLine, RiFolderOpenLine, RiPlugLine, RiSparklingLine } from "@remixicon/react"
import type { Automation, KnowledgeSource, McpServer, WorkflowRun } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function StudioHero({
  workspaceName,
  sources,
  totalChunks,
  mcpServers,
  connectedCount,
  totalMcpTools,
  automations,
  workflowRuns
}: {
  workspaceName: string
  sources: KnowledgeSource[]
  totalChunks: number
  mcpServers: McpServer[]
  connectedCount: number
  totalMcpTools: number
  automations: Automation[]
  workflowRuns: WorkflowRun[]
}) {
  const t = useT()

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-button-default/70 bg-gradient-to-br from-background-primary-default via-background-secondary-default/50 to-accent-500/[0.04] p-6 shadow-xs">
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-sm ring-1 ring-accent-500/20">
              <RiSparklingLine className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-title-3-semibold text-text-primary">{t("studio.hero.title")}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t("studio.hero.localFirst")}
                </span>
              </div>
              <p className="mt-1 text-caption-1-medium text-text-secondary">{t("studio.hero.description")}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <PulseStat
            icon={RiFolderOpenLine}
            tone="bg-blue-500/10 text-blue-500"
            label={t("studio.hero.workspace")}
            value={workspaceName || t("studio.hero.none")}
          />
          <PulseStat
            icon={RiBookOpenLine}
            tone="bg-emerald-500/10 text-emerald-500"
            label={t("studio.hero.knowledgeRag")}
            value={t("studio.hero.sourcesChunks", { sources: sources.length, chunks: totalChunks })}
          />
          <PulseStat
            icon={RiPlugLine}
            tone="bg-purple-500/10 text-purple-500"
            label={t("studio.hero.mcpPlugins")}
            value={t("studio.hero.mcpActive", {
              connected: connectedCount,
              total: mcpServers.length,
              tools: totalMcpTools
            })}
          />
          <PulseStat
            icon={RiFlashlightLine}
            tone="bg-amber-500/10 text-amber-500"
            label={t("studio.hero.automations")}
            value={t("studio.hero.rulesRuns", { rules: automations.length, runs: workflowRuns.length })}
          />
        </div>
      </div>
    </div>
  )
}

function PulseStat({
  icon: Icon,
  tone,
  label,
  value
}: {
  icon: typeof RiFolderOpenLine
  tone: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border-button-default/50 bg-background-primary-default/80 p-2.5 shadow-2xs backdrop-blur-sm">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-text-tertiary uppercase">{label}</p>
        <p className="truncate text-caption-1-medium font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  )
}
