/**
 * 技能工作区顶部工具栏：统计指标、健康状态徽标与全局操作。
 */
import { RiAddLine, RiRefreshLine, RiShieldCheckLine, RiStethoscopeLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"

export function SkillsToolbar({
  sourceCount,
  deployedCount,
  driftCount,
  warningCount,
  busy,
  onDoctor,
  onUpdateAll,
  onImport
}: {
  sourceCount: number
  deployedCount: number
  driftCount: number
  warningCount: number
  busy: boolean
  onDoctor: () => void
  onUpdateAll: () => void
  onImport: () => void
}) {
  const hasIssues = driftCount > 0 || warningCount > 0

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-separator-border/60 pb-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-title-3-semibold text-text-primary tracking-tight">
            {SKILLS_UI_COPY.moduleTitle}
          </h1>
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption-2-medium transition-colors",
              hasIssues
                ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <span
              className={cx(
                "size-1.5 rounded-full",
                hasIssues ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              )}
            />
            {hasIssues ? `${driftCount} 处漂移` : SKILLS_UI_COPY.healthyState}
          </span>
        </div>
        <div className="flex items-center gap-3 text-caption-2-regular text-text-tertiary">
          <span>
            {SKILLS_UI_COPY.sourcesCount} <b className="text-text-secondary font-medium">{sourceCount}</b>
          </span>
          <span className="text-separator-border">/</span>
          <span>
            {SKILLS_UI_COPY.deployedCount} <b className="text-text-secondary font-medium">{deployedCount}</b>
          </span>
          {driftCount > 0 ? (
            <>
              <span className="text-separator-border">/</span>
              <span className="text-amber-600 dark:text-amber-400">
                {SKILLS_UI_COPY.driftCount} {driftCount}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDoctor}
          className="gap-1.5 h-8 text-caption-2-medium"
        >
          {hasIssues ? (
            <RiStethoscopeLine className="size-3.5 text-amber-500" />
          ) : (
            <RiShieldCheckLine className="size-3.5 text-emerald-500" />
          )}
          <span>Doctor 诊断</span>
        </Button>

        {sourceCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onUpdateAll}
            className="gap-1.5 h-8 text-caption-2-medium"
          >
            <RiRefreshLine className={cx("size-3.5", busy && "animate-spin")} />
            <span>{SKILLS_UI_COPY.updateAll}</span>
          </Button>
        ) : null}

        <Button
          size="sm"
          onClick={onImport}
          className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
        >
          <RiAddLine className="size-3.5" />
          <span>{SKILLS_UI_COPY.importSource}</span>
        </Button>
      </div>
    </header>
  )
}
