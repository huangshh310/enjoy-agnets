/**
 * 时间线空态：左对齐说明，不要虚线大框。
 */
import { useT } from "@renderer/i18n"

export function InboxEmpty() {
  const t = useT()
  return (
    <div>
      <p className="text-body-medium text-text-secondary">{t("pages.inbox.empty")}</p>
      <p className="mt-1 text-caption-1-regular text-text-tertiary">{t("pages.inbox.emptyHint")}</p>
    </div>
  )
}
