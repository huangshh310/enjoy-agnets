/**
 * 浏览预设顶部的自定义端点横幅。
 * 只开一扇门：进抽屉后主 API 默认 Chat，另外两条留空。
 */
import { RiFlashlightLine, RiServerLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"
import { useT } from "@renderer/i18n"

export function ProviderCustomBanner({
  onSelect
}: {
  onSelect: (kind: ProviderKind, apiStyle: ApiStyle) => void
}) {
  const t = useT()
  return (
    <section className="relative overflow-hidden rounded-xl border border-border-button-default bg-linear-to-br from-background-secondary-default/80 via-background-primary-default to-background-secondary-default/50 p-3 shadow-xs transition-all hover:border-border-button-hover">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default text-accent-600 shadow-xs">
            <RiServerLine className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                {t("settings.providers.bannerTitle")}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-caption-1-semibold text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">
                <RiFlashlightLine className="size-3" />
                {t("settings.providers.recommended")}
              </span>
            </div>
            <p className="mt-0.5 max-w-2xl text-caption-2-medium text-text-secondary">
              {t("settings.providers.bannerDesc")}
            </p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => onSelect("custom", "openai")} className="shrink-0 self-start rounded-xl md:self-auto">
          {t("settings.providers.addCustom")}
        </Button>
      </div>
    </section>
  )
}
