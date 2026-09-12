/**
 * 发送闸三块文案：检测中 / 授权中 / 失败。Picker、横幅、设置共用同一套键。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { EngineReadiness } from "../../components/ai-chat/agent-picker/engine-readiness"
import { formatOfficialLoginFailLine } from "../../components/ai-chat/agent-picker/official-login-reason"

export type SendGateCopy = {
  title: string
  hint: string
}

export function sendGateCopy(
  kind: EngineReadiness,
  t: TranslateFn,
  failReason?: string
): SendGateCopy | null {
  if (kind === "inspecting") {
    return {
      title: t("chat.agentInspecting"),
      hint: t("chat.needCliInspectingHint")
    }
  }
  if (kind === "authorizing") {
    return {
      title: t("chat.needCliAuthorizeTitle"),
      hint: t("chat.needCliAuthorizeHint")
    }
  }
  if (kind === "login_failed") {
    return {
      title: t("chat.needCliLoginFailTitle"),
      hint: formatOfficialLoginFailLine(failReason, t)
    }
  }
  if (kind === "needs_login") {
    return {
      title: t("chat.needCliAuthorizeTitle"),
      hint: t("chat.needCliLoginHint")
    }
  }
  return null
}
