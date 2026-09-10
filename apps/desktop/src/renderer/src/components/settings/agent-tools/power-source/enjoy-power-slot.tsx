/**
 * Enjoy 本地的「这个助手用」：当前 vault 档案 + 模型，不画 ToolLoop 微标。
 */
import { RiShieldKeyholeLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { enjoyVaultFromProviders } from "./resolve-row-source"

export function EnjoyPowerSlot() {
  const t = useT()
  const navigate = useNavigate()
  const snapshot = useSettingsSnapshot().data
  const vault = enjoyVaultFromProviders(snapshot?.providers ?? [], snapshot?.defaultModelId)
  const text = vault.archive
    ? t("settings.agentTools.boundSummary", {
        provider: vault.archive,
        model: vault.model || "—"
      })
    : t("settings.agentTools.enjoyEmptyHint")
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border-button-default bg-background-secondary-default/40 px-3 py-2.5">
        <p className="text-caption-1-medium text-text-primary">{text}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.localVaultHint")}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
        className="h-9 w-full gap-1.5 text-caption-1-medium"
      >
        <RiShieldKeyholeLine className="size-3.5 text-accent-500" />
        {t("settings.agentTools.manageProviders")}
      </Button>
    </div>
  )
}
