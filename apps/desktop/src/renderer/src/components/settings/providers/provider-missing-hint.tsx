/**
 * 「保存并启用」灰着时说清缺什么（mike P3，#163 巡检 25）：缺的那一栏下面一行琥珀小字，
 * 底栏按钮旁一句「还差：…」（字段在另一页签时带上页签名），页签上一个小圆点。
 */
import { useT } from "@renderer/i18n"
import { MISSING_FIELD_HINT_KEY } from "./provider-missing-copy"
import { missingFieldTab, type EditorMissingField } from "./providers.types"

export function MissingFieldHint({
  missing,
  field
}: {
  missing?: readonly EditorMissingField[]
  field: EditorMissingField
}) {
  const t = useT()
  if (!missing?.includes(field)) return null
  return (
    <p data-testid={`provider-missing-${field}`} className="text-caption-2-medium text-status-yellow-text">
      {t(MISSING_FIELD_HINT_KEY[field])}
    </p>
  )
}

/** 页签上的小圆点：这一页还有没填的必填项。 */
export function MissingTabDot({ missing, tab }: { missing?: readonly EditorMissingField[]; tab: "connection" | "models" }) {
  const t = useT()
  if (!missing?.some((field) => missingFieldTab(field) === tab)) return null
  return (
    <span
      data-testid={`provider-missing-tab-${tab}`}
      role="img"
      aria-label={t("settings.providers.missingTabAria")}
      className="size-1.5 shrink-0 rounded-full bg-status-yellow-text"
    />
  )
}
