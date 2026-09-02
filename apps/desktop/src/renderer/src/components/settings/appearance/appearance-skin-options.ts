/**
 * 外观页皮肤选项：短名 + 辅助说明（仅 aria）。
 */
import type { ThemeSkin } from "@renderer/hooks/use-theme-skin"
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
    },
    {
      id: "ink",
      name: t("settings.appearance.skinInk"),
      hint: t("settings.appearance.skinInkDesc")
    },
    {
      id: "sketch",
      name: t("settings.appearance.skinSketch"),
      hint: t("settings.appearance.skinSketchDesc")
    }
  ]
}

export function appearanceSkinLabel(skin: ThemeSkin, t: TranslateFn): string {
  if (skin === "glass") return t("settings.appearance.skinGlass")
  if (skin === "ink") return t("settings.appearance.skinInk")
  if (skin === "sketch") return t("settings.appearance.skinSketch")
  return t("settings.appearance.skinClassic")
}
