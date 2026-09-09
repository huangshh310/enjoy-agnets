/**
 * Composer 可见执行模式：智能体 / 规划 / 问答 / 调试。
 * workflow / tdd / code_mode 仍在合约 enum，发送时收成 agent。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"

export const COMPOSER_VISIBLE_MODES = ["agent", "plan", "ask", "debug"] as const
export type ComposerVisibleMode = (typeof COMPOSER_VISIBLE_MODES)[number]

const SLASH_MODE = /^(agent|plan|ask|debug)$/

/** 设置 refetch 不得覆盖当前会话 mode。默认项只在设置页写入。 */
export function sessionModeAfterSettingsRefresh(
  current: ComposerVisibleMode,
  _defaultMode?: AgentMode
): ComposerVisibleMode {
  return current
}

/** 隐藏工程模式不当成真工具策略，回落到智能体。 */
export function coerceComposerMode(mode: AgentMode): ComposerVisibleMode {
  return COMPOSER_VISIBLE_MODES.includes(mode as ComposerVisibleMode)
    ? (mode as ComposerVisibleMode)
    : "agent"
}

/** 新建会话才读默认项；设置 refetch 仍走 sessionModeAfterSettingsRefresh。 */
export function modeForNewSession(defaultMode?: AgentMode): ComposerVisibleMode {
  return coerceComposerMode(defaultMode ?? "agent")
}

let rememberedDefaultMode: AgentMode = "agent"

/** settings 快照写入；新建会话禁止再打 settings.get（会扫 PATH）。 */
export function rememberDefaultMode(mode?: AgentMode) {
  rememberedDefaultMode = mode ?? "agent"
}

export function readRememberedDefaultMode(): AgentMode {
  return rememberedDefaultMode
}

/** 句首 `/plan` `/ask` `/agent` `/debug` 切模式；只发斜杠则正文为空。 */
export function takeComposerSlash(text: string): { mode?: ComposerVisibleMode; text: string } {
  const match = text.trim().match(/^\/(\w+)(?:\s+([\s\S]*))?$/)
  if (!match || !SLASH_MODE.test(match[1] ?? "")) return { text }
  return {
    mode: match[1] as ComposerVisibleMode,
    text: (match[2] ?? "").trim()
  }
}
