/**
 * 外观页皮肤选择：并排迷你窗，不铺营销双卡。
 */
import { useThemeSkin } from "@renderer/hooks/use-theme-skin"
import { useT } from "@renderer/i18n"
import { AppearanceSkinCard } from "./appearance-skin-card"
import { appearanceSkinOptions } from "./appearance-skin-options"

export function AppearanceSkinPicker() {
  const t = useT()
  const skin = useThemeSkin()
  return (
    <div className="flex flex-wrap gap-5 px-5 py-4">
      {appearanceSkinOptions(t).map((option) => (
        <AppearanceSkinCard key={option.id} option={option} selected={skin === option.id} />
      ))}
    </div>
  )
}
