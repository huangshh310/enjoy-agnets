/** 自动化抽屉保存不了的原因（luna #151）：提示词空必说；名字也空时合并成一句。 */
type T = (key: "studio.automations.promptRequired" | "studio.automations.namePromptRequired") => string

export function automationSaveReason(draft: { name: string; prompt: string }, t: T): string | null {
  if (draft.prompt.trim()) return null
  return draft.name.trim() ? t("studio.automations.promptRequired") : t("studio.automations.namePromptRequired")
}
