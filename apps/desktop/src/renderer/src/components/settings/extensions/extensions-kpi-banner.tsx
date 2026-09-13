/**
 * 扩展中心三联生态态势概览磁贴：
 * 1. 已就绪 MCP 服务
 * 2. 已装载技能套件
 * 3. 官方与社区生态池
 */
import { RiApps2Line, RiCpuLine, RiFlashlightLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { mcpHubHref, skillsHubHref } from "./extensions-hrefs.ts"

interface ExtensionsKpiBannerProps {
  mcpCount: number
  skillCount: number
  totalCuratedCount: number
}

export function ExtensionsKpiBanner({
  mcpCount,
  skillCount,
  totalCuratedCount
}: ExtensionsKpiBannerProps) {
  const t = useT()

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {/* 1. MCP 协议服务 */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-4.5 shadow-card transition-all hover:border-accent-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-caption-2-medium text-text-tertiary">
              {t("settings.extensions.kpiMcpTitle")}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-title-2-bold text-text-primary">{mcpCount}</span>
              <span className="text-caption-2-regular text-text-secondary">
                {t("settings.extensions.kpiMcpDesc")}
              </span>
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <RiCpuLine className="size-4.5" />
          </div>
        </div>
        <a
          href={mcpHubHref()}
          className="mt-3 flex items-center gap-1 border-t border-separator-border/50 pt-2.5 text-caption-2-medium text-accent-600 hover:text-accent-500 dark:text-accent-400 transition-colors"
        >
          <span>{t("settings.extensions.openMcpHub")}</span>
        </a>
      </div>

      {/* 2. 技能工作流套件 */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-4.5 shadow-card transition-all hover:border-accent-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-caption-2-medium text-text-tertiary">
              {t("settings.extensions.kpiSkillsTitle")}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-title-2-bold text-text-primary">{skillCount}</span>
              <span className="text-caption-2-regular text-text-secondary">
                {t("settings.extensions.kpiSkillsDesc")}
              </span>
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <RiFlashlightLine className="size-4.5" />
          </div>
        </div>
        <a
          href={skillsHubHref()}
          className="mt-3 flex items-center gap-1 border-t border-separator-border/50 pt-2.5 text-caption-2-medium text-accent-600 hover:text-accent-500 dark:text-accent-400 transition-colors"
        >
          <span>{t("settings.extensions.openSkillsHub")}</span>
        </a>
      </div>

      {/* 3. 官方与社区扩展生态 */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-4.5 shadow-card transition-all hover:border-accent-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-caption-2-medium text-text-tertiary">
              {t("settings.extensions.kpiEcosystemTitle")}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-title-2-bold text-text-primary">{totalCuratedCount}+</span>
              <span className="text-caption-2-regular text-text-secondary">
                {t("settings.extensions.kpiEcosystemDesc")}
              </span>
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <RiApps2Line className="size-4.5" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-separator-border/50 pt-2.5 text-caption-2-regular text-text-tertiary">
          <span>开箱即用 · 本机运行</span>
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  )
}
