/**
 * 规则页标题、常驻条数、刷新与新建。
 */
import { RiAddLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { pickAlwaysOnRules } from "@enjoy-agents/ipc-contract/rules-always-on"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function RulesHeader(props: {
  discoveredRules: readonly ProjectRuleItem[]
  isRefreshing: boolean
  onRefresh: () => void
  onCreate: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3 pb-2 border-b border-separator-border/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-title-3-semibold text-text-primary tracking-tight">{t("studio.rules.title")}</h2>
            <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium font-mono font-medium text-accent-500 dark:text-accent-500">
              <span className="size-1.5 rounded-full bg-accent-500" />
              {t("studio.rules.badge")}
            </span>
          </div>
          <p className="text-caption-2-medium text-text-tertiary">{t("studio.rules.desc")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-separator-border/60 bg-background-secondary-default/40 px-2.5 py-1 text-caption-2-regular text-text-secondary font-mono mr-1">
            <span>{t("studio.rules.activeCount", { count: pickAlwaysOnRules(props.discoveredRules).length })}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={props.onRefresh}
            disabled={props.isRefreshing}
            className="gap-1.5 h-8 text-caption-2-medium"
          >
            <RiRefreshLine className={cx("size-3.5", props.isRefreshing && "animate-spin")} />
            <span>{t("studio.scanRefresh")}</span>
          </Button>
          <Button size="sm" onClick={props.onCreate} className="gap-1.5 h-8 text-caption-2-medium shadow-xs">
            <RiAddLine className="size-3.5" />
            <span>{t("studio.rules.newRule")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
