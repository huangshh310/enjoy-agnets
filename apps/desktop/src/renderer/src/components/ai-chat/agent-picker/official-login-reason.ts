/**
 * 仅官方登录失败：一行人话原因，禁止英文堆栈 / Oh My Pi 误伤。
 */
import type { TranslateFn } from "@renderer/i18n"

export type OfficialLoginReasonKind = "timeout" | "missing" | "generic"

export function classifyOfficialLoginReason(code: string | undefined): OfficialLoginReasonKind {
  const lower = (code ?? "").toLowerCase()
  if (!lower || lower === "failed") return "generic"
  if (isTimeout(lower)) return "timeout"
  if (isMissing(lower)) return "missing"
  return "generic"
}

export function officialLoginReasonKey(kind: OfficialLoginReasonKind): string {
  if (kind === "timeout") return "settings.agentTools.loginFailTimeout"
  if (kind === "missing") return "settings.agentTools.loginFailMissing"
  return "settings.agentTools.loginFailGeneric"
}

/** 未登录上：{短原因} */
export function formatOfficialLoginFailLine(code: string | undefined, t: TranslateFn): string {
  const reason = t(officialLoginReasonKey(classifyOfficialLoginReason(code)))
  return t("settings.agentTools.loginFailPrefix", { reason })
}

function isTimeout(lower: string): boolean {
  return (
    lower === "callback_timeout" ||
    /timed out|timeout|etimedout|callback/.test(lower)
  )
}

function isMissing(lower: string): boolean {
  return /install .+ first|install the cli first|not found|enoent|no login command/.test(lower)
}
