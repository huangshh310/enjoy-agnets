/**
 * 模型路由表格行。
 */
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { useT } from "@renderer/i18n"
import {
  formatLatency,
  RoutingCapabilityIcons,
  RoutingModelIdentity,
  RoutingRowActions,
  RoutingStatusChip
} from "./model-routing-row-cells"
import type { ModelRoutingRowData } from "./model-routing.types"

export function ModelRoutingTableRow(props: {
  row: ModelRoutingRowData
  probing: boolean
  probe?: { ok: boolean; ms: number }
  onProbe: (id: string) => void
  onSelectModelTrace?: (modelId: string) => void
}) {
  const { row, probing, probe, onProbe, onSelectModelTrace } = props
  const t = useT()

  return (
    <tr className="group transition-colors hover:bg-background-secondary-default/40">
      <td className="px-4 py-3">
        <RoutingModelIdentity row={row} />
      </td>
      <td className="px-4 py-3 font-mono text-caption-2-medium text-text-secondary">
        <span className="inline-flex items-center rounded border border-border-button-default/40 bg-background-secondary-default/80 px-2 py-0.5">
          {row.upstreamName}
        </span>
      </td>
      <td className="px-4 py-3">
        <RoutingCapabilityIcons capabilities={row.capabilities} />
      </td>
      <td className="px-4 py-3">
        <RoutingStatusChip status={row.status} />
      </td>
      <td className="px-4 py-3 text-text-secondary">
        <span className="inline-flex items-center gap-1.5 rounded border border-border-button-default/40 bg-background-secondary-default/80 px-2 py-0.5 text-caption-2-medium">
          <ModelBrandIcon modelId={row.provider} providerKind={row.provider} size={13} />
          <span>{row.providerName}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-caption-1-medium text-text-primary">
        {row.callCount > 0 ? t("pages.observability.callTimes", { n: row.callCount }) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-caption-1-medium">
        {row.callCount > 0 ? (
          <span className={row.successRate >= 90 ? "text-state-success-text" : "text-text-secondary"}>
            {row.successRate}%
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-caption-1-medium text-text-secondary">
        {row.p95DurationMs > 0 ? formatLatency(row.p95DurationMs) : <span className="text-text-tertiary">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <RoutingRowActions
          row={row}
          probing={probing}
          probe={probe}
          onProbe={onProbe}
          onSelectModelTrace={onSelectModelTrace}
        />
      </td>
    </tr>
  )
}
