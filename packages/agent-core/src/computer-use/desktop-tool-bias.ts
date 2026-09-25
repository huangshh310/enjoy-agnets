/**
 * CU-P1-B：Execute 下按 Composer 提及偏置 desktop_* 工具序。
 * 短指令一行，不堆 system prompt。提及 ≠ 放行，不写会话表 / 持久簿。
 */
import type { AgentMode, DesktopMentionBias } from "@enjoy-agents/ipc-contract"
import { isReadOnlyAgentMode } from "../tools/coding-tool-names.ts"
import { isStableDesktopAppKey } from "./desktop-act-app-key.ts"

const HOST_LINE = "Prefer desktop_* tools this turn. Mentions do not skip approval."

/** pid / 空 / 脏键不当稳 appKey；不编造 bundleId。 */
export function sanitizeDesktopMentionBias(
  bias: DesktopMentionBias | null | undefined
): DesktopMentionBias | undefined {
  if (!bias) return undefined
  if (bias.kind === "host") return { kind: "host" }
  const displayName = bias.displayName.trim()
  if (!displayName) return { kind: "host" }
  const appKey = bias.appKey.trim()
  if (!isStableDesktopAppKey(appKey)) {
    return { kind: "app", displayName, appKey: "", stable: false }
  }
  return { kind: "app", displayName, appKey, stable: true }
}

/** Explore 不偏置。Execute 把已注册的 desktop_* 提前，不新增工具。 */
export function applyDesktopToolOrder<T extends object>(
  tools: T,
  bias: DesktopMentionBias | undefined,
  mode: string
): T {
  const clean = sanitizeDesktopMentionBias(bias)
  if (!clean || !isExecuteMode(mode)) return tools
  const head: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [name, tool] of Object.entries(tools)) {
    if (name.startsWith("desktop_")) head[name] = tool
    else rest[name] = tool
  }
  if (Object.keys(head).length === 0) return tools
  return { ...head, ...rest } as T
}

/** 一行偏置。Explore 空串，避免装已连接。 */
export function formatDesktopBiasInstruction(
  bias: DesktopMentionBias | undefined,
  mode: string
): string {
  const clean = sanitizeDesktopMentionBias(bias)
  if (!clean || !isExecuteMode(mode)) return ""
  if (clean.kind === "app" && clean.stable && clean.appKey) {
    return `Prefer desktop_* tools this turn for appKey ${clean.appKey}. Mentions do not skip approval.`
  }
  return HOST_LINE
}

function isExecuteMode(mode: string): boolean {
  return !isReadOnlyAgentMode(mode as AgentMode)
}
