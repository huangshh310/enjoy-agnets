/**
 * 页脚钉死本机诚实句。禁止写成关闭后仍跑。
 */
import { useT } from "@renderer/i18n"

export function AutomationFooter() {
  const t = useT()
  return (
    <p className="mt-auto border-t border-separator-border bg-background-secondary-default px-4 py-2 text-caption-1-medium text-text-tertiary">
      {t("studio.automations.localOnly")}
    </p>
  )
}
