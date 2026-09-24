/**
 * 介绍页三块：本机、已有引擎、先看再收工。
 */
import { RiCheckboxCircleLine, RiFolder3Line, RiRobot2Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { GUIDE_TILE_CLASS } from "./setup-guide-frame"

const POINTS = [
  { icon: RiFolder3Line, title: "settings.setupGuide.localTitle", body: "settings.setupGuide.localBody" },
  { icon: RiRobot2Line, title: "settings.setupGuide.agentsTitle", body: "settings.setupGuide.agentsBody" },
  { icon: RiCheckboxCircleLine, title: "settings.setupGuide.reviewTitle", body: "settings.setupGuide.reviewBody" }
] as const

export function IntroPoints() {
  const t = useT()
  return (
    <ul className="grid h-full min-h-0 flex-1 grid-cols-3 gap-4">
      {POINTS.map((point) => {
        const Icon = point.icon
        return (
          <li key={point.title} className={cx("flex h-full flex-col gap-2.5 p-5", GUIDE_TILE_CLASS)}>
            <Icon className="size-[18px] text-text-primary/80" aria-hidden />
            <span className="text-[15px] font-medium text-text-primary">{t(point.title)}</span>
            <span className="text-[13px] leading-normal text-text-secondary">{t(point.body)}</span>
          </li>
        )
      })}
    </ul>
  )
}
