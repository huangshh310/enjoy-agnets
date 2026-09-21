/**
 * P0-E 过旧文案：密表次行例外、信任行、发送闸。禁止协议词。
 */
import {
  isBehindLatest,
  requiredVersionFor,
  resolveCliCompat,
  type CliCompatView
} from "@enjoy-agents/ipc-contract/cli-compat"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"

const WARN_DOT = "bg-state-warning-text"
const WARN_TEXT = "text-state-warning-text"

export function cliCompatOf(tool: Pick<AgentToolPublic, "id" | "version" | "requiredVersion" | "authAccount">): CliCompatView {
  return resolveCliCompat({
    version: tool.version,
    cliVersion: tool.authAccount?.cliVersion,
    requiredVersion: tool.requiredVersion ?? requiredVersionFor(tool.id)
  })
}

export function isCliOutdated(tool: Pick<AgentToolPublic, "id" | "version" | "requiredVersion" | "authAccount">): boolean {
  return cliCompatOf(tool).kind === "outdated"
}

export function canUpdateCli(
  tool: Pick<AgentToolPublic, "installKind" | "version" | "latestVersion" | "authAccount">
): boolean {
  if (tool.installKind !== "npm" && tool.installKind !== "brew") return false
  return isBehindLatest(tool.version ?? tool.authAccount?.cliVersion, tool.latestVersion)
}

export function outdatedAssistantStatus(t: TranslateFn): {
  label: string
  dotClass: string
  textClass: string
} {
  return {
    label: t("settings.agentTools.listOutdatedStatus"),
    dotClass: WARN_DOT,
    textClass: WARN_TEXT
  }
}

/** 仅不兼容可破「版本 · 路径」：需更新 · v1.2（要 ≥1.5） */
export function formatOutdatedSecondary(view: CliCompatView, t: TranslateFn): string {
  return t("settings.agentTools.listOutdatedSecondary", {
    current: view.current,
    required: view.required
  })
}

export function formatTrustOutdated(view: CliCompatView, t: TranslateFn): string {
  return t("settings.agentTools.trustOutdated", {
    current: view.current,
    required: view.required
  })
}
