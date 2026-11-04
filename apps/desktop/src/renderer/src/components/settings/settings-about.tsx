/**
 * 设置 → 关于 Enjoy：版本/更新簇 + P2 Remote soft 本机跑异地控边界卡。
 */
import { RiInformationLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { RemoteSoftBoundaryCard } from "./remote-soft/remote-soft-boundary-card"
import { SettingsHub } from "./settings-hub"
import { SettingsUpdateCard } from "./settings-update-card"

export function AboutSettings() {
  const t = useT()
  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiInformationLine}
        title={t("settings.about.hubTitle")}
        description={t("settings.about.hubDesc")}
      />
      <RemoteSoftBoundaryCard />
      <SettingsUpdateCard />
    </div>
  )
}
