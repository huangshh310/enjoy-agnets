/**
 * 浏览器预览位：尚未接线，占一栏以免选项空点。
 */
import { useT } from "@renderer/i18n"

export function BrowserView() {
  const t = useT()
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center text-body-medium text-text-tertiary">
      {t("chat.browserSoon")}
    </div>
  )
}
