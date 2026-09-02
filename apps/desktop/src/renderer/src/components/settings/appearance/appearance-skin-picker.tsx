/**
 * 外观页皮肤选择网格。
 */
import { useThemeSkin } from "@renderer/hooks/use-theme-skin"
import { useT } from "@renderer/i18n"
import { AppearanceSkinCard } from "./appearance-skin-card"
import { appearanceSkinOptions } from "./appearance-skin-options"

export function AppearanceSkinPicker() {
  const t = useT()
  const skin = useThemeSkin()
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-body-regular text-text-secondary">{t("settings.appearance.skinDesc")}</p>
      <div className="grid gap-3 pt-1 sm:grid-cols-2">
        {appearanceSkinOptions(t).map((option) => (
          <AppearanceSkinCard key={option.id} option={option} selected={skin === option.id} />
        ))}
      </div>
    </div>
  )
}
