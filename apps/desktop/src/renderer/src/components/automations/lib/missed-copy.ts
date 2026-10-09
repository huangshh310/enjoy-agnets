/**
 * AUTO-P2 人话：跳过原因与稳定错误码只走这里，禁止把 code 摊到 C 端。
 */
import type { AutomationErrorCode, AutomationSkipReason } from "@enjoy-agents/ipc-contract"

type Translate = (key: string, vars?: Record<string, string | number>) => string

const SKIP_LABEL: Record<AutomationSkipReason, string> = {
  system_sleep: "studio.automations.skipReasonSleep",
  app_not_running: "studio.automations.skipReasonClosed",
  previous_still_running: "studio.automations.skipReasonBusy"
}

const SKIP_TIP: Record<AutomationSkipReason, string> = {
  system_sleep: "studio.automations.skipTipSleep",
  app_not_running: "studio.automations.skipTipClosed",
  previous_still_running: "studio.automations.skipTipBusy"
}

const ERROR_LABEL: Record<AutomationErrorCode, string> = {
  catch_up_approval_timeout: "studio.automations.catchUpTimeout",
  interrupted_by_restart: "studio.automations.catchUpInterrupted"
}

export function isSkipReason(value: string | undefined): value is AutomationSkipReason {
  return value === "system_sleep" || value === "app_not_running" || value === "previous_still_running"
}

export function isNeutralErrorCode(code: string | undefined): code is AutomationErrorCode {
  return code === "catch_up_approval_timeout" || code === "interrupted_by_restart"
}

/** 人话原因。未知值回「已错过」，永不回原始码。 */
export function skipReasonCopy(reason: string | undefined, t: Translate): string {
  if (!isSkipReason(reason)) return t("studio.automations.skipReasonUnknown")
  return t(SKIP_LABEL[reason])
}

export function skipReasonTip(reason: string | undefined, t: Translate): string {
  if (!isSkipReason(reason)) return t("studio.automations.skipReasonUnknown")
  return t(SKIP_TIP[reason])
}

/** 超时 / 重启打断。未知码回 null，调用方不要把 code 当文案。 */
export function errorCodeCopy(code: string | undefined, t: Translate): string | null {
  if (!isNeutralErrorCode(code)) return null
  return t(ERROR_LABEL[code])
}

export function automationSourceCopy(
  source: { automationName?: string; isCatchUp?: boolean } | undefined,
  t: Translate
): string | null {
  const name = source?.automationName?.trim()
  if (!name) return null
  return source?.isCatchUp
    ? t("chat.automationSourceCatchUp", { name })
    : t("chat.automationSourceOnTime", { name })
}
