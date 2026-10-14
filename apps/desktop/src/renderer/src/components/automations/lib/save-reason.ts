/** 自动化抽屉保存不了的原因（luna #151 / jojo P2）：缺什么说什么；名字和提示词都空时合并成一句。 */
type T = (
  key: "studio.automations.promptRequired" | "studio.automations.namePromptRequired" | "studio.automations.nameRequired"
) => string

export function automationSaveReason(draft: { name: string; prompt: string }, t: T): string | null {
  const hasName = Boolean(draft.name.trim())
  const hasPrompt = Boolean(draft.prompt.trim())
  if (hasName && hasPrompt) return null
  if (!hasName && !hasPrompt) return t("studio.automations.namePromptRequired")
  return hasName ? t("studio.automations.promptRequired") : t("studio.automations.nameRequired")
}

/** 原因的语气：抽屉刚打开、用户还没动过时用中性灰，动过之后才用红（luna：一打开就红像报错）。 */
export function automationSaveReasonTone(touched: boolean): "neutral" | "error" {
  return touched ? "error" : "neutral"
}
