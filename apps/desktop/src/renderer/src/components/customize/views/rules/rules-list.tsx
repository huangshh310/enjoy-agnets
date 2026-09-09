/**
 * 已发现规则网格：空态、无匹配、卡片列表。
 */
import { RiBookOpenLine } from "@remixicon/react"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { RuleCard } from "./rule-card"

export function RulesList(props: {
  discoveredCount: number
  filteredRules: readonly ProjectRuleItem[]
  onReveal: (filePath: string) => void
  onInspect: (rule: ProjectRuleItem) => void
  onDelete: (rule: ProjectRuleItem) => void
}) {
  const t = useT()
  if (props.discoveredCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-8 text-center">
        <div className="flex size-9 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary mb-2.5">
          <RiBookOpenLine className="size-4.5" />
        </div>
        <h3 className="text-caption-1-medium font-semibold text-text-primary">{t("studio.rules.emptyTitle")}</h3>
        <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary leading-relaxed">
          {t("studio.rules.emptyHint")}
        </p>
      </div>
    )
  }
  if (props.filteredRules.length === 0) {
    return <div className="py-8 text-center text-caption-2-medium text-text-tertiary">{t("studio.rules.noMatch")}</div>
  }
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {props.filteredRules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          onReveal={props.onReveal}
          onInspect={props.onInspect}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  )
}
