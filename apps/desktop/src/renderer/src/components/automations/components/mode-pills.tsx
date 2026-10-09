/**
 * 探索 / 执行。内部写入 plan / agent，C 端不露协议词。
 */
import { cx } from "@/utils/cx"
import type { AutomationMode } from "@enjoy-agents/ipc-contract"
import { surfaceForMode } from "@renderer/components/ai-chat/composer/composer-mode"
import { useT } from "@renderer/i18n"

export function ModePills({
  mode,
  onChange
}: {
  mode: AutomationMode
  onChange: (mode: AutomationMode) => void
}) {
  const t = useT()
  const surface = surfaceForMode(mode)
  return (
    <div>
      <p className="text-caption-1-medium text-text-primary">{t("studio.automations.mode")}</p>
      <div className="mt-1 inline-flex rounded-full bg-background-secondary-default p-0.5 ring-1 ring-border-button-default">
        <button
          type="button"
          onClick={() => onChange("plan")}
          className={cx(
            "rounded-full px-3 py-1 text-caption-1-medium",
            surface === "explore" ? "bg-accent-500 font-semibold text-text-white" : "text-text-tertiary"
          )}
        >
          {t("chat.surfaceExplore")}
        </button>
        <button
          type="button"
          onClick={() => onChange("agent")}
          className={cx(
            "rounded-full px-3 py-1 text-caption-1-medium",
            surface === "execute" ? "bg-accent-500 font-semibold text-text-white" : "text-text-tertiary"
          )}
        >
          {t("chat.surfaceExecute")}
        </button>
      </div>
    </div>
  )
}
