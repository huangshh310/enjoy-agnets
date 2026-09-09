/**
 * 根据 `omp auth-broker login` 的 stdout 决定下一步。
 * GitHub Copilot 会先 readline 问 Enterprise 域名，空回车才打 device URL。
 */
import {
  extractDeviceUserCode,
  extractLoginUrl,
  loginFinished,
  looksLikeEmptyOkPrompt,
  looksLikeInteractiveLogin
} from "./extract-login-url.ts"

export type OmpLoginPlan =
  | { action: "wait" }
  | { action: "answer_empty" }
  | { action: "open"; url: string; userCode?: string; needsPaste: boolean }
  | { action: "needs_tui" }
  | { action: "done" }

/** 先抽 URL，再处理可空回车的提问，避免把设备码页误判成 TUI。 */
export function planOmpLogin(text: string): OmpLoginPlan {
  if (loginFinished(text)) return { action: "done" }
  const url = extractLoginUrl(text)
  if (url) {
    return {
      action: "open",
      url,
      userCode: extractDeviceUserCode(text) ?? undefined,
      needsPaste: looksLikeInteractiveLogin(text)
    }
  }
  if (looksLikeEmptyOkPrompt(text)) return { action: "answer_empty" }
  if (looksLikeInteractiveLogin(text)) return { action: "needs_tui" }
  return { action: "wait" }
}

export function resultForOpen(plan: Extract<OmpLoginPlan, { action: "open" }>): {
  ok: boolean
  message: string
} {
  if (plan.needsPaste) return { ok: false, message: "needs_tui" }
  if (plan.userCode) return { ok: true, message: `device:${plan.userCode}` }
  return { ok: true, message: "browser_opened" }
}

export type OmpLoginNotice = { ok: boolean; message: string }

/** 打开授权页只发 notice；凭证写入才 settle。粘贴密钥仍立刻结束。 */
export type OmpLoginDecision = {
  writeEmpty?: boolean
  openUrl?: string
  waitDeviceCode?: boolean
  notice?: OmpLoginNotice
  settle?: OmpLoginNotice
}

export function decideOmpLogin(
  plan: OmpLoginPlan,
  ctx: { answered: boolean; opened: boolean },
  flush = false
): OmpLoginDecision {
  if (plan.action === "done") return { settle: { ok: true, message: "logged_in" } }
  if (plan.action === "answer_empty" && !ctx.answered) return { writeEmpty: true }
  if (plan.action === "open") return decideOpen(plan, ctx.opened, flush)
  if (plan.action === "needs_tui") return { settle: { ok: false, message: "needs_tui" } }
  return {}
}

function decideOpen(
  plan: Extract<OmpLoginPlan, { action: "open" }>,
  opened: boolean,
  flush: boolean
): OmpLoginDecision {
  const notice = resultForOpen(plan)
  const openUrl = opened ? undefined : plan.url
  if (plan.needsPaste) return { openUrl, settle: notice }
  const waitDeviceCode =
    !plan.userCode && !flush && /\/login\/device/i.test(plan.url)
  return {
    openUrl,
    waitDeviceCode,
    notice: waitDeviceCode ? undefined : notice
  }
}
