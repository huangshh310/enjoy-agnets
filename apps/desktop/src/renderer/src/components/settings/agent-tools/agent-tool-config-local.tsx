/**
 * Enjoy 本地配置：说明内核，并跳到模型供应商。
 */
import { RiCpuLine, RiShieldKeyholeLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { getAgentBrandMeta } from "./agent-tool-constants"

export function AgentToolConfigLocal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const meta = getAgentBrandMeta("enjoy-local")
  return (
    <div className="space-y-4">
      <div className="space-y-2.5 rounded-xl border border-accent-500/25 bg-accent-500/5 p-4">
        <div className="flex items-center gap-2">
          <RiCpuLine className="size-4 text-accent-500" />
          <span className="text-body-medium font-semibold text-text-primary">{t("settings.agentTools.title")}</span>
        </div>
        <p className="text-caption-1-regular leading-relaxed text-text-secondary">
          {t("settings.agentTools.localKernel")}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {meta.capabilities.map((cap) => (
            <span
              key={cap.code}
              className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-text-secondary"
            >
              {cap.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border-button-default bg-background-secondary-default/40 p-4">
        <p className="text-caption-2-regular text-text-secondary">{t("settings.agentTools.providerHint")}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onClose()
            void navigate({ to: "/settings/$section", params: { section: "providers" } })
          }}
          className="shrink-0 gap-1.5 text-caption-1-medium"
        >
          <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
          {t("settings.agentTools.manageProviders")}
        </Button>
      </div>
    </div>
  )
}
