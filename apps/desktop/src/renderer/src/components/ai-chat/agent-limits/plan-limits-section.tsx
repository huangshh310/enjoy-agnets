/**
 * 计划配额与速率限制下半区组件 (Plan Usage Limits Section)
 */
import { RiArrowRightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { PlanLimitItem } from "./agent-limits.types"
import { DEFAULT_PLAN_LIMITS } from "./agent-limits-calculator"
import { useT, type TranslateFn } from "@renderer/i18n"

interface PlanLimitsSectionProps {
  limits?: PlanLimitItem[]
  planTitle?: string
  planHref?: string
  onManagePlan?: () => void
  className?: string
}

export function PlanLimitsSection({
  limits = DEFAULT_PLAN_LIMITS,
  planTitle,
  planHref,
  onManagePlan,
  className
}: PlanLimitsSectionProps) {
  const t = useT()
  const title = planTitle ?? t("chat.planLimits")
  const rows = limits.map((item) => localizePlanLimit(item, t))
  return (
    <div className={cx("flex flex-col gap-3 w-full border-t border-border-button-default/70 pt-3.5", className)}>
      {/* 1. 标题栏与跳转动作 */}
      <div className="flex items-center justify-between">
        <span className="text-caption-1-medium font-medium text-text-secondary">
          {title}
        </span>
        {planHref || onManagePlan ? (
          <button
            type="button"
            onClick={onManagePlan}
            className="flex items-center gap-0.5 text-caption-2-medium text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer"
          >
            <span>{t("chat.manage")}</span>
            <RiArrowRightLine className="size-3.5" />
          </button>
        ) : (
          <RiArrowRightLine className="size-3.5 text-text-tertiary/70" />
        )}
      </div>

      {/* 2. 各周期速率限制条目 */}
      <div className="flex flex-col gap-2.5">
        {rows.map((item) => (
          <div key={item.id} className="flex flex-col gap-1.5">
            {/* 顶栏：限额名称 + 重置倒计时 + 百分比 */}
            <div className="flex items-center justify-between text-caption-1-medium select-none">
              <span className="font-semibold text-text-primary">{item.label}</span>
              <div className="flex items-center gap-2 text-caption-2-medium font-medium">
                <span className="text-text-tertiary">{item.resetText}</span>
                <span className="font-semibold text-text-primary w-8 text-right font-mono">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* 进度条 */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800/80">
              <div
                style={{ width: `${Math.max(item.percentage, 2)}%` }}
                className={cx(
                  "h-full rounded-full transition-all duration-300",
                  item.barColorClass ?? "bg-accent-500"
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 计划限额文案按 id 映射，不改计算器数值。 */
function localizePlanLimit(item: PlanLimitItem, t: TranslateFn): PlanLimitItem {
  if (item.id === "five_hour") {
    return { ...item, label: t("chat.limitFiveHour"), resetText: t("chat.limitResetSoon") }
  }
  if (item.id === "weekly_all") {
    return { ...item, label: t("chat.limitWeeklyAll"), resetText: t("chat.limitResetTue") }
  }
  if (item.id === "weekly_pro") {
    return { ...item, label: t("chat.limitWeeklyPro"), resetText: t("chat.limitResetTue") }
  }
  return item
}
