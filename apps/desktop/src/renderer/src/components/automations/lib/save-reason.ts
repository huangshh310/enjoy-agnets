/** 自动化抽屉保存不了的原因（luna #151 / jojo P2 / jojo #154 P3）：缺什么说什么；名字和提示词都空时合并成一句。 */
type Key =
  | "studio.automations.promptRequired"
  | "studio.automations.namePromptRequired"
  | "studio.automations.nameRequired"
  | "studio.automations.cronRequired"
  | "studio.automations.saveFirstToRun"
  | "studio.automations.webhookPortRequired"
type T = (key: Key) => string

export function automationSaveReason(
  draft: { name: string; prompt: string; triggers?: readonly string[]; cronExpr?: string; webhookPort?: string },
  t: T
): string | null {
  const hasName = Boolean(draft.name.trim())
  const hasPrompt = Boolean(draft.prompt.trim())
  if (!hasName && !hasPrompt) return t("studio.automations.namePromptRequired")
  if (!hasName) return t("studio.automations.nameRequired")
  if (!hasPrompt) return t("studio.automations.promptRequired")
  if (draft.triggers?.includes("cron") && !draft.cronExpr?.trim()) return t("studio.automations.cronRequired")
  // webhook 端口无效时说清楚（leo #154 S4）；规则同 trigger-chips.webhookPortReady（1–65535 整数）。
  if (draft.triggers?.includes("webhook") && !portValid(draft.webhookPort)) return t("studio.automations.webhookPortRequired")
  return null
}

/** 原因的语气：抽屉刚打开、用户还没动过时用中性灰，动过之后才用红（luna：一打开就红像报错）。 */
export function automationSaveReasonTone(touched: boolean): "neutral" | "error" {
  return touched ? "error" : "neutral"
}

/** 「立即运行」置灰时的 tooltip：未保存 →「先保存再运行」；已保存但缺东西 → 保存原因（jojo #154 P3）。 */
export function runDisabledTitle(
  input: { saved: boolean; running: boolean; saveReason: string | null },
  t: T
): string | undefined {
  if (input.running) return undefined
  if (!input.saved) return t("studio.automations.saveFirstToRun")
  return input.saveReason ?? undefined
}

function portValid(raw: string | undefined): boolean {
  const port = Number(raw)
  return raw !== undefined && raw.trim() !== "" && Number.isInteger(port) && port >= 1 && port <= 65535
}
