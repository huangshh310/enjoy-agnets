/**
 * 模型路由行的能力图标、健康态与探测操作。
 */
import {
  RiArrowRightLine,
  RiBrainLine,
  RiBrushLine,
  RiChat1Line,
  RiCodeSSlashLine,
  RiEyeLine,
  RiFilmLine,
  RiMicLine,
  RiPulseLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { useT, type TranslateFn } from "@renderer/i18n"
import type { ModelRoutingRowData } from "./model-routing.types"

const CAP_ICONS = [
  { cap: "text", alt: "chat", icon: RiChat1Line, titleKey: "pages.observability.capText" },
  { cap: "tools", icon: RiCodeSSlashLine, titleKey: "pages.observability.capTools" },
  { cap: "vision", icon: RiEyeLine, titleKey: "pages.observability.capVision" },
  { cap: "image", icon: RiBrushLine, titleKey: "pages.observability.capImage" },
  { cap: "video", icon: RiFilmLine, titleKey: "pages.observability.capVideo" },
  { cap: "realtime", icon: RiMicLine, titleKey: "pages.observability.capRealtime" }
] as const

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

export function RoutingModelIdentity(props: { row: ModelRoutingRowData }) {
  const t = useT()
  const { row } = props
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border-button-default/50 bg-background-secondary-default/80 p-1 shadow-2xs">
        <ModelBrandIcon modelId={row.id} providerKind={row.provider} size={18} />
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-caption-1-semibold tracking-tight text-text-primary">
            {row.id}
          </span>
          {row.isReasoning ? (
            <span
              title={t("pages.observability.reasoningBadge")}
              className="inline-flex items-center gap-0.5 rounded bg-accent-500/10 px-1 py-0.5 font-mono text-caption-2-medium text-accent-500"
            >
              <RiBrainLine className="size-2.5" />
              <span>CoT</span>
            </span>
          ) : null}
        </div>
        <span className="truncate text-caption-2-medium text-text-tertiary">{row.label}</span>
      </div>
    </div>
  )
}

export function RoutingCapabilityIcons(props: { capabilities: string[] }) {
  const t = useT()
  return (
    <div className="flex items-center gap-1">
      {CAP_ICONS.map((item) => {
        const visible =
          props.capabilities.includes(item.cap) ||
          ("alt" in item && item.alt ? props.capabilities.includes(item.alt) : false)
        if (!visible) return null
        const Icon = item.icon
        return (
          <span
            key={item.cap}
            title={t(item.titleKey)}
            className="flex size-5.5 items-center justify-center rounded bg-background-secondary-default text-text-secondary"
          >
            <Icon className="size-3" />
          </span>
        )
      })}
    </div>
  )
}

export function RoutingStatusChip(props: { status: ModelRoutingRowData["status"] }) {
  const t = useT()
  const { status } = props
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption-2-medium",
        status === "healthy" &&
          "border-state-success-text/20 bg-state-success-text/10 text-state-success-text",
        status === "degraded" &&
          "border-border-button-default bg-background-secondary-default text-text-secondary",
        status === "unconfigured" &&
          "border-border-button-default bg-background-secondary-default text-text-tertiary"
      )}
    >
      <span
        className={cx(
          "size-1.5 rounded-full",
          status === "healthy" && "bg-state-success-text",
          status === "degraded" && "bg-text-secondary",
          status === "unconfigured" && "bg-text-tertiary"
        )}
      />
      {statusLabel(status, t)}
    </span>
  )
}

function statusLabel(status: ModelRoutingRowData["status"], t: TranslateFn): string {
  if (status === "healthy") return t("pages.observability.statusHealthy")
  if (status === "degraded") return t("pages.observability.statusDegraded")
  return t("pages.observability.statusUnconfigured")
}

export function RoutingRowActions(props: {
  row: ModelRoutingRowData
  probing: boolean
  probe?: { ok: boolean; ms: number }
  onProbe: (id: string) => void
  onSelectModelTrace?: (modelId: string) => void
}) {
  const { row, probing, probe, onProbe, onSelectModelTrace } = props
  const t = useT()
  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onProbe(row.id)}
        disabled={probing || !row.providerId}
        title={t("pages.observability.probeTitle")}
        className="h-7 gap-1 px-2 text-caption-2-medium"
      >
        <RiPulseLine className={cx("size-3.5", probing && "animate-spin text-accent-500")} />
        {probe ? (
          <span
            className={cx(
              "font-mono text-caption-2-medium",
              probe.ok ? "text-state-success-text" : "text-text-error-primary"
            )}
          >
            {probe.ok ? formatLatency(probe.ms) : t("pages.observability.probeFailed")}
          </span>
        ) : (
          <span>{t("pages.observability.probe")}</span>
        )}
      </Button>
      {onSelectModelTrace && row.callCount > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSelectModelTrace(row.id)}
          title={t("pages.observability.viewModelTraces")}
          className="h-7 px-2 text-caption-2-medium text-text-secondary hover:text-accent-500"
        >
          <RiArrowRightLine className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
