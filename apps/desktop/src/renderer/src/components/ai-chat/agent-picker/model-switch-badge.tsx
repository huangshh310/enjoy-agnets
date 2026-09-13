/**
 * 「已切换」角标：同引擎会话换模后提示下一轮生效，禁止当用户气泡或 handoff brief。
 */
import { useT } from "@renderer/i18n"

export function ModelSwitchBadge({ visible }: { visible: boolean }) {
  const t = useT()
  if (!visible) return null
  return (
    <span
      className="inline-flex max-w-[14rem] items-center gap-1 rounded-full bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary"
      title={t("chat.modelSwitch.hint")}
    >
      {t("chat.modelSwitch.badge")}
    </span>
  )
}
