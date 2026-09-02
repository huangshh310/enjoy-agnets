/**
 * Trace 属性表与原始 JSON。
 */
import { useT } from "@renderer/i18n"

export function ObservabilityTraceAttributes({
  rows
}: {
  rows: Array<{ key: string; label: string; value: string }>
}) {
  const t = useT()
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-separator-border/70 font-mono text-caption-2-regular shadow-2xs">
      <div className="grid grid-cols-12 border-b border-separator-border/60 bg-background-secondary-default/70 px-4 py-2.5 font-semibold text-text-tertiary">
        <div className="col-span-5">{t("pages.observability.attrColName")}</div>
        <div className="col-span-3">{t("pages.observability.attrColLabel")}</div>
        <div className="col-span-4">{t("pages.observability.attrColValue")}</div>
      </div>
      <div className="divide-y divide-separator-border/40 bg-background-primary-default">
        {rows.map((attr) => (
          <div
            key={attr.key}
            className="grid grid-cols-12 items-center px-4 py-2.5 hover:bg-background-secondary-hover/30"
          >
            <div className="col-span-5 truncate font-bold text-accent-500">{attr.key}</div>
            <div className="col-span-3 truncate text-text-secondary">{attr.label}</div>
            <div className="col-span-4 truncate font-semibold text-text-primary">{attr.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ObservabilityTraceJson({ rawJson }: { rawJson: string }) {
  return (
    <div className="rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-4 font-mono text-caption-2-regular leading-relaxed text-text-primary shadow-inner">
      <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap select-all">{rawJson}</pre>
    </div>
  )
}
