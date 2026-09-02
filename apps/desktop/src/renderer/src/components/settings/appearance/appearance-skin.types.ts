/**
 * 外观页皮肤选项的数据结构。
 */
import type { ComponentType } from "react"
import type { ThemeSkin } from "@renderer/hooks/use-theme-skin"

export type AppearanceSkinIcon = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type AppearanceSkinOption = {
  id: ThemeSkin
  icon: AppearanceSkinIcon
  name: string
  desc: string
}
