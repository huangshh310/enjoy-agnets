/**
 * 页脚钉死本机诚实句。webhook 另写「仅本机端口，非公网」。
 */
import { useT } from "@renderer/i18n"
import { joinSegments } from "@renderer/lib/join-segments"

export function AutomationFooter() {
  const t = useT()
  return (
    <p className="mt-auto border-t border-separator-border bg-background-secondary-default px-4 py-2 text-caption-1-medium text-text-secondary">
      {joinSegments(t("studio.automations.localOnly"), t("studio.automations.webhookLocalOnly"))}
    </p>
  )
}
