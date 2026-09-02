/**
 * 外观页皮肤选项：id / 图标 / 文案。文案走 i18n。
 */
import { RiLayoutGridLine, RiSparklingLine } from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"
import type { AppearanceSkinOption } from "./appearance-skin.types"

export function appearanceSkinOptions(t: TranslateFn): AppearanceSkinOption[] {
  return [
    {
      id: "classic",
      icon: RiLayoutGridLine,
      name: t("settings.appearance.skinClassic"),
      desc: t("settings.appearance.skinClassicDesc")
    },
    {
      id: "glass",
      icon: RiSparklingLine,
      name: t("settings.appearance.skinGlass"),
      desc: t("settings.appearance.skinGlassDesc")
    }
  ]
}
