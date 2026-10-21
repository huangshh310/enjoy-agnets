/**
 * 「保存并启用」灰着时的说明文案（纯函数，node --test 直接测；画法见 provider-missing-hint.tsx）。
 */
import { missingFieldTab, type EditorMissingField } from "./providers.types.ts"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export const MISSING_FIELD_HINT_KEY: Record<EditorMissingField, string> = {
  name: "settings.providers.missingNameHint",
  endpoint: "settings.providers.missingEndpointHint",
  key: "settings.providers.missingKeyHint",
  model: "settings.providers.missingModelHint"
}

const FIELD_NAME_KEY: Record<EditorMissingField, string> = {
  name: "settings.providers.displayName",
  endpoint: "settings.providers.baseUrl",
  key: "settings.providers.apiKey",
  model: "settings.providers.primary"
}

/** 底栏一句：「还差：显示名称、主力模型（在「模型」页）」。simple 表单没有页签，不带页签名。 */
export function missingSummaryText(missing: readonly EditorMissingField[], t: Translate, withTabs: boolean): string {
  if (missing.length === 0) return ""
  const names = missing.map((field) => {
    const name = t(FIELD_NAME_KEY[field])
    if (!withTabs || missingFieldTab(field) === "connection") return name
    return t("settings.providers.missingOnTab", { field: name, tab: t("settings.providers.tabModels") })
  })
  return t("settings.providers.missingSummary", { fields: names.join(t("settings.providers.missingJoiner")) })
}
