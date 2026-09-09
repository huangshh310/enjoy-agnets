/**
 * 本机 CLI 说明书：默认收起。静态能力表 + 配置归属，不挡装/登录。
 */
import { RiArrowDownSLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { CapabilityMatrix } from "./capability-matrix"
import { ConfigBoundaryTable } from "./config-boundary-table"

export function AgentCapabilityDocs({ onJump }: { onJump: (runtimeId: string) => void }) {
  const t = useT()
  return (
    <details className="group rounded-xl border border-border-button-default bg-background-primary-default">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-body-medium font-semibold text-text-primary">
            {t("settings.runtimeCaps.docsTitle")}
          </span>
          <span className="mt-0.5 block text-caption-1-regular text-text-secondary">
            {t("settings.runtimeCaps.docsHint")}
          </span>
        </span>
        <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-6 border-t border-separator-border px-4 py-4">
        <CapabilityMatrix onJump={onJump} />
        <ConfigBoundaryTable />
      </div>
    </details>
  )
}
