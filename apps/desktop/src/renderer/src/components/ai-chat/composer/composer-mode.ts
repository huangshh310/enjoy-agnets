/**
 * Composer 执行模式。
 * C 端只露探索 / 执行；内部仍是 ask|plan vs agent，不新 runtime。
 * workflow / tdd / code_mode 仍在合约 enum，发送时收成 agent。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"

export const COMPOSER_VISIBLE_MODES = ["agent", "plan", "ask", "debug"] as const
export type ComposerVisibleMode = (typeof COMPOSER_VISIBLE_MODES)[number]

/** C 端分段。探索 = ask/plan 只读语义；执行 = agent（debug 同面）。 */
export const COMPOSER_SURFACES = ["explore", "execute"] as const
export type ComposerSurface = (typeof COMPOSER_SURFACES)[number]

const SLASH_MODE_ALIASES: Record<string, ComposerVisibleMode> = {
  explore: "plan",
  execute: "agent",
  plan: "plan",
  ask: "ask",
  agent: "agent",
  debug: "debug"
}

/** 设置 refetch 不得覆盖当前会话 mode。默认项只在设置页写入。 */
export function sessionModeAfterSettingsRefresh(
  current: ComposerVisibleMode,
  _defaultMode?: AgentMode
): ComposerVisibleMode {
  return current
}

/** 隐藏工程模式不当成真工具策略，回落到 agent。 */
export function coerceComposerMode(mode: AgentMode): ComposerVisibleMode {
  return COMPOSER_VISIBLE_MODES.includes(mode as ComposerVisibleMode)
    ? (mode as ComposerVisibleMode)
    : "agent"
}

/** ask/plan → 探索；其余（含 debug）→ 执行。 */
export function surfaceForMode(mode: AgentMode): ComposerSurface {
  const visible = coerceComposerMode(mode)
  return visible === "plan" || visible === "ask" ? "explore" : "execute"
}

/** 分段默认写入：探索用 plan（可出方案），执行用 agent。 */
export function modeForSurface(surface: ComposerSurface): ComposerVisibleMode {
  return surface === "explore" ? "plan" : "agent"
}

/** 已在该面则保留 ask/debug；跨面才落到默认内部值。 */
export function applyComposerSurface(
  current: AgentMode,
  surface: ComposerSurface
): ComposerVisibleMode {
  if (surfaceForMode(current) === surface) return coerceComposerMode(current)
  return modeForSurface(surface)
}

/** 新建会话才读默认项；设置 refetch 仍走 sessionModeAfterSettingsRefresh。 */
export function modeForNewSession(defaultMode?: AgentMode): ComposerVisibleMode {
  return coerceComposerMode(defaultMode ?? "agent")
}

/** 切回已有会话：用该会话记下的 mode；没有记录则 agent，不用设置默认项。 */
export function modeForLoadedSession(saved?: AgentMode): ComposerVisibleMode {
  return saved ? coerceComposerMode(saved) : "agent"
}

/** 探索/执行跟 store；宿主拦截写工具，不再因 ACP 强制 agent。 */
export function runModeForComposer(_runtimeId: string, mode: AgentMode): ComposerVisibleMode {
  return coerceComposerMode(mode)
}

let rememberedDefaultMode: AgentMode = "agent"

/** settings 快照写入；新建会话禁止再打 settings.get（会扫 PATH）。 */
export function rememberDefaultMode(mode?: AgentMode) {
  rememberedDefaultMode = mode ?? "agent"
}

export function readRememberedDefaultMode(): AgentMode {
  return rememberedDefaultMode
}

/** 句首 `/explore` `/execute` 以及内部别名 `/plan` `/ask` `/agent` `/debug`。 */
export function takeComposerSlash(text: string): { mode?: ComposerVisibleMode; text: string } {
  const match = text.trim().match(/^\/(\w+)(?:\s+([\s\S]*))?$/)
  const token = match?.[1]?.toLowerCase() ?? ""
  const mapped = SLASH_MODE_ALIASES[token]
  if (!match || !mapped) return { text }
  return {
    mode: mapped,
    text: (match[2] ?? "").trim()
  }
}

export function slashAliasToMode(token: string): ComposerVisibleMode | undefined {
  return SLASH_MODE_ALIASES[token.toLowerCase()]
}
