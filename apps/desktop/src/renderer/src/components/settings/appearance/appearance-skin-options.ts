/**
 * 外观页皮肤选项：短名 + 辅助说明（仅 aria）。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { AppearanceSkinOption } from "./appearance-skin.types"

export function appearanceSkinOptions(t: TranslateFn): AppearanceSkinOption[] {
  return [
    {
      id: "classic",
      name: t("settings.appearance.skinClassic"),
      hint: t("settings.appearance.skinClassicDesc")
    },
    {
      id: "glass",
      name: t("settings.appearance.skinGlass"),
      hint: t("settings.appearance.skinGlassDesc")
    }
  ]
}
