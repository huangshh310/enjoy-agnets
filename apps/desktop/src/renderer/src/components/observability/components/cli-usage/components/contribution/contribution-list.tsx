/**
 * 按 CLI 贡献列表。点选过滤，再点一次回到全部。
 */
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import type { SourceContribution } from "../../lib/filter"
import { sourceNameKey } from "../../lib/source-chip-copy"
import { CliUsageContributionRow } from "./contribution-row"

export function CliUsageContributionList(props: {
  items: SourceContribution[]
  selectedId: CliUsageSourceId | null
  onToggle: (id: CliUsageSourceId) => void
  onClear: () => void
}) {
  const t = useT()
  if (props.items.length === 0) return null
  return (
    <section className="overflow-hidden rounded-xl border border-separator-border/70 bg-background-primary-default">
      <header className="flex items-center justify-between gap-3 px-3.5 py-2">
        <h3 className="text-caption-1-medium text-text-secondary">
          {t("pages.observability.cliUsageContribution")}
        </h3>
        <FilterCaption
          selectedId={props.selectedId}
          onClear={props.onClear}
        />
      </header>
      <ul className="divide-y divide-separator-border/40 border-t border-separator-border/60">
        {props.items.map((item) => (
          <CliUsageContributionRow
            key={item.source.id}
            source={item.source}
            share={item.share}
            selected={props.selectedId === item.source.id}
            onToggle={props.onToggle}
          />
        ))}
      </ul>
    </section>
  )
}

function FilterCaption(props: { selectedId: CliUsageSourceId | null; onClear: () => void }) {
  const t = useT()
  if (!props.selectedId) {
    return (
      <p className="text-caption-2-medium text-text-tertiary">{t("pages.observability.cliUsageFilterHint")}</p>
    )
  }
  return (
    <button
      type="button"
      onClick={props.onClear}
      className="text-caption-2-medium text-accent-500 transition-colors hover:text-accent-600"
    >
      {t("pages.observability.cliUsageShowingSource", {
        name: t(sourceNameKey(props.selectedId))
      })}
      {" · "}
      {t("pages.observability.cliUsageShowAll")}
    </button>
  )
}
