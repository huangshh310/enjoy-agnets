/**
 * 产品主标。≤32px 用 icon-small；更大随主题用 icon-light / icon-dark。
 */
import { useThemeMode } from "@/components/application/theme/theme-toggle"
import { cx } from "@/utils/cx"
import { MARK_DARK, MARK_LIGHT, MARK_SMALL, SMALL_MARK_MAX_PX } from "./constants"

export function AppMark({
  size = 16,
  className
}: {
  size?: number
  className?: string
}) {
  const theme = useThemeMode()
  const src =
    size <= SMALL_MARK_MAX_PX ? MARK_SMALL : theme === "dark" ? MARK_DARK : MARK_LIGHT

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cx("shrink-0 select-none", className)}
    />
  )
}
