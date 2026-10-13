/**
 * 自动化抽屉底栏提示：只跟真实触发方式走。含「手动」时底栏是「立即运行」，不出「到点才跑」之类（luna 3cf0）。
 */
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"

export function footerHint(triggers: readonly AutomationTrigger[], t: (key: string) => string): string | null {
  if (triggers.includes("manual")) return null
  if (triggers.includes("webhook")) return t("studio.automations.webhookNoRun")
  if (triggers.includes("on_save")) return t("studio.automations.onSaveNoRun")
  if (triggers.includes("cron")) return t("studio.automations.cronNoRun")
  return null
}
