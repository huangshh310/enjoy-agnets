/**
 * 启动预设套用后的桌面叙事小标。开 ≠ 已批准 / ≠ Always-allow。
 */
import { useT } from "@renderer/i18n"
import { usePresetDesktopBias } from "../agent-picker/preset-desktop-bias"

export function PresetDesktopBiasPill() {
  const t = useT()
  const on = usePresetDesktopBias()
  if (!on) return null
  return (
    <span
      data-testid="preset-desktop-bias-pill"
      className="inline-flex h-6 items-center rounded-full bg-accent-500/10 px-2 text-caption-2-semibold text-accent-600 ring-1 ring-accent-500/25"
    >
      {t("chat.presetDesktopBiasPill")}
    </span>
  )
}
