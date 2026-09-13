/**
 * 无用量来源：默认收起。不把「本版本不扫描」铺成 12 粒芯片。
 */
import { RiArrowRightSLine } from "@remixicon/react"
import type { CliUsageSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { idleGroups } from "../../lib/filter"
import { sourceChipStatusKey, sourceNameKey } from "../../lib/source-chip-copy"

export function CliUsageIdleSources({ sources }: { sources: CliUsageSource[] }) {
  const t = useT()
  const groups = idleGroups(sources)
  if (groups.length === 0) return null
  const count = groups.reduce((sum, group) => sum + group.sources.length, 0)
  return (
    <details className="group w-full rounded-xl border border-separator-border/60 bg-background-secondary-default/30 px-3.5 py-2">
      <summary className="flex w-full cursor-pointer list-none text-caption-2-medium text-text-tertiary marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <RiArrowRightSLine className="size-3.5 text-text-tertiary transition-transform group-open:rotate-90" />
          {t("pages.observability.cliUsageIdleTitle", { n: count })}
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2 pb-1">
        {groups.map((group) => (
          <IdleGroup key={group.status} status={group.status} sources={group.sources} />
        ))}
      </div>
    </details>
  )
}

function IdleGroup(props: {
  status: CliUsageSource["status"]
  sources: CliUsageSource[]
}) {
  const t = useT()
  if (props.status === "scanned-empty") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-2-medium text-text-tertiary">
        {props.sources.map((item, idx) => {
          const text = t(sourceChipStatusKey(item), {
            name: t(sourceNameKey(item.id)),
            n: item.sessionCount
          })
          const tooltip =
            item.fileCount > 0
              ? t("pages.observability.cliUsageChipNoFieldsTooltip")
              : t("pages.observability.cliUsageChipEmptyDirTooltip")
          return (
            <span key={item.id} className="inline-flex items-center">
              {idx > 0 ? <span className="mr-2 text-separator-border select-none">·</span> : null}
              <span
                title={tooltip}
                className="cursor-help hover:text-text-secondary transition-colors underline decoration-dotted decoration-text-tertiary/40 underline-offset-2"
              >
                {text}
              </span>
            </span>
          )
        })}
      </div>
    )
  }
  const label =
    props.status === "unsupported"
      ? t("pages.observability.cliUsageUnsupportedSummary")
      : t("pages.observability.cliUsageMissingSummary")
  const names = props.sources.map((item) => t(sourceNameKey(item.id))).join(" · ")
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption-2-medium text-text-secondary">{label}</p>
      <p className="text-caption-2-medium text-text-tertiary">{names}</p>
    </div>
  )
}
