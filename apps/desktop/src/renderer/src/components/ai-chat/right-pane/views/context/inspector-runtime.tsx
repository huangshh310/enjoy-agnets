/**
 * 模型与运行时摘要。
 */
import { RiCommandLine, RiCpuLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { resolveModelDisplayName } from "@renderer/lib/model-display-name"

export function InspectorRuntime({
  modelId,
  modelLabel,
  mode
}: {
  modelId: string
  modelLabel: string
  mode: string
}) {
  const t = useT()
  return (
    <section className="mt-auto flex flex-col gap-2 border-t border-separator-border/50 pt-3">
      <span className="text-caption-2-medium font-semibold text-text-tertiary">
        {t("chat.inspectorRuntime")}
      </span>
      <div className="flex flex-col gap-1.5 rounded-xl border border-border-button-default/70 bg-background-secondary-default/30 p-2.5 text-caption-2-medium">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <RiCpuLine className="size-3.5" />
            {t("chat.inspectorModel")}
          </span>
          <span className="max-w-[140px] truncate font-mono font-semibold text-text-primary" title={modelId}>
            {resolveModelDisplayName(modelId, modelLabel)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <RiCommandLine className="size-3.5" />
            {t("chat.inspectorMode")}
          </span>
          <span className="text-text-secondary">{mode}</span>
        </div>
      </div>
    </section>
  )
}
