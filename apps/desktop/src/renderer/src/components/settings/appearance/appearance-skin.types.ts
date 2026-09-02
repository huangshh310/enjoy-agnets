/**
 * 外观页皮肤选项。
 */
import type { ThemeSkin } from "@renderer/hooks/use-theme-skin"

export type AppearanceSkinOption = {
  id: ThemeSkin
  name: string
  hint: string
}
