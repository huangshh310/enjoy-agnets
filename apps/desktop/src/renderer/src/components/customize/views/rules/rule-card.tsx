/**
 * 单条已发现规则卡片：徽标、匹配 glob、定位 / 查看 / 删除。
 */
import { RiDeleteBinLine, RiEyeLine, RiFolderOpenLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ruleKindBadge } from "./rules-kind"

export function RuleCard(props: {
  rule: ProjectRuleItem
  onReveal: (filePath: string) => void
  onInspect: (rule: ProjectRuleItem) => void
  onDelete: (rule: ProjectRuleItem) => void
}) {
  const t = useT()
  const { rule } = props
  const badge = ruleKindBadge(rule.agentKind)
  return (
    <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cx(
                "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold font-mono",
                badge.className
              )}
            >
              {badge.short}
            </div>
            <div className="min-w-0">
              <h4 className="text-caption-1-medium font-semibold text-text-primary truncate">{rule.name}</h4>
              <span className="text-[10px] font-mono text-text-tertiary truncate block">{rule.filePath}</span>
            </div>
          </div>
          <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-text-secondary shrink-0">
            {rule.agentKindLabel}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">{rule.description}</p>
        {rule.globs ? (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10.5px] text-text-tertiary">{t("studio.rules.match")}</span>
            <code className="rounded bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] text-accent-600 dark:text-accent-400">
              {rule.globs}
            </code>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => props.onReveal(rule.filePath)}
            className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
            title={t("studio.rules.revealTitle")}
          >
            <RiFolderOpenLine className="size-3.5" />
            <span>{t("studio.rules.reveal")}</span>
          </button>
          <button
            type="button"
            onClick={() => props.onInspect(rule)}
            className="inline-flex items-center gap-1 text-text-tertiary hover:text-accent-500 transition-colors ml-2"
            title={t("studio.rules.inspectTitle")}
          >
            <RiEyeLine className="size-3.5" />
            <span>{t("studio.rules.inspect")}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => props.onDelete(rule)}
          className="p-1 text-text-tertiary hover:text-rose-500 transition-colors"
          title={t("studio.rules.deleteTitle")}
        >
          <RiDeleteBinLine className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
