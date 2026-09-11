/**
 * 表行上来源品牌标。多于一个源时加「多来源」，避免混源数字被当成单 CLI。
 */
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useT } from "@renderer/i18n"
import { sourceNameKey } from "../lib/source-chip-copy"

export function CliUsageSourceMarks({ ids }: { ids: CliUsageSourceId[] }) {
  const t = useT()
  if (ids.length === 0) {
    return <span className="text-caption-1-medium text-text-tertiary">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1">
      {ids.map((id) => (
        <span key={id} className="inline-flex shrink-0" title={t(sourceNameKey(id))}>
          <AgentBrandIcon id={id} size={14} />
        </span>
      ))}
      {ids.length > 1 ? (
        <span className="text-caption-2-medium text-text-tertiary">
          {t("pages.observability.cliUsageMixedRow")}
        </span>
      ) : null}
    </span>
  )
}
