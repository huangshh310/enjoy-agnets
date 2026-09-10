/**
 * 本机 CLI 密表安装态：主槽文案与一行人话失败原因。禁止把 npm 堆栈摊上表。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { AgentToolBusy } from "./agent-tool-actions-run"

export type InstallRowPhase = "idle" | "installing" | "failed"

export function installRowPhase(input: {
  ready: boolean
  busy: AgentToolBusy
  installError: string | null
}): InstallRowPhase {
  if (input.ready) return "idle"
  if (input.busy === "install") return "installing"
  if (input.installError?.trim()) return "failed"
  return "idle"
}

/** 把安装失败原文收成短原因，再套「未装上：…」。 */
export function formatInstallFailLine(raw: string, t: TranslateFn): string {
  return t("settings.agentTools.installFailPrefix", { reason: mapInstallFailReason(raw, t) })
}

export function mapInstallFailReason(raw: string, t: TranslateFn): string {
  const lower = raw.toLowerCase()
  if (isTimeout(lower)) return t("settings.agentTools.installFailTimeout")
  if (isPermission(lower)) return t("settings.agentTools.installFailPermission")
  if (isMissingManager(lower)) return t("settings.agentTools.installFailManager")
  return t("settings.agentTools.installFailGeneric")
}

function isTimeout(lower: string): boolean {
  return /timed out|etimedout|enotfound|eai_again|econnreset|enetunreach|network timeout|socket hang up/.test(
    lower
  )
}

function isPermission(lower: string): boolean {
  return /eacces|eperm|permission denied|access denied|operation not permitted/.test(lower)
}

function isMissingManager(lower: string): boolean {
  return /need npm|need brew|npm or brew/.test(lower) && /path/.test(lower)
}
