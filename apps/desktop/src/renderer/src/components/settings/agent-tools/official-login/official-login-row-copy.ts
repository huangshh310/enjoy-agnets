/**
 * 仅官方密表四态文案。动力源前缀永远是「官方登录 ·」。
 */
import type { TranslateFn } from "@renderer/i18n"
import { formatOfficialLoginFailLine } from "@renderer/components/ai-chat/agent-picker/official-login-reason"
import type { OfficialLoginRowPhase } from "./official-login-phase"

export function officialLoginAssistantStatus(
  phase: OfficialLoginRowPhase,
  t: TranslateFn
): { label: string; dotClass: string; textClass: string } | null {
  if (phase === "check") {
    return {
      label: t("settings.agentTools.loginCheckingStatus"),
      dotClass: "bg-accent-500 animate-pulse",
      textClass: "text-accent-600"
    }
  }
  if (phase === "auth") {
    return {
      label: t("settings.agentTools.loginAuthorizingStatus"),
      dotClass: "bg-accent-500 animate-pulse",
      textClass: "text-accent-600"
    }
  }
  if (phase === "fail") {
    return {
      label: t("settings.agentTools.loginFailedStatus"),
      dotClass: "bg-text-error-primary",
      textClass: "text-text-error-primary"
    }
  }
  if (phase === "out") {
    return {
      label: t("settings.agentTools.statusPending"),
      dotClass: "bg-status-yellow-text",
      textClass: "text-status-yellow-text"
    }
  }
  return null
}

export function officialLoginPrimaryLabel(phase: OfficialLoginRowPhase, t: TranslateFn): string {
  if (phase === "check") return t("settings.agentTools.officialCheckingAction")
  if (phase === "auth") return t("settings.agentTools.officialWaitAuth")
  if (phase === "fail") return t("settings.agentTools.officialRetryAuth")
  return t("settings.agentTools.officialOpenAuth")
}

export function officialLoginHint(
  phase: OfficialLoginRowPhase,
  reason: string,
  t: TranslateFn
): string | null {
  if (phase === "auth") return t("settings.agentTools.loginAuthorizingHint")
  if (phase === "fail") return formatOfficialLoginFailLine(reason, t)
  return null
}
