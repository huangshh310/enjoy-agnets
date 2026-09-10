/**
 * ACP 没有 session/set_mode：宿主协作模式用围栏垫进 Prompt。
 * 对照 Codex / Claude 的 /plan 切模式，禁止再收成「引用自步骤」。
 */
import type { ComposerVisibleMode } from "../composer-mode.ts"

const OPEN = "[Enjoy host mode:"
const CLOSE = "[/Enjoy host mode]"
const FENCE = /\[Enjoy host mode:\s*\w+\][\s\S]*?\[\/Enjoy host mode\]/

export function hostModePrefix(mode: ComposerVisibleMode): string {
  if (mode === "agent") return ""
  return `${OPEN} ${mode}]\n${hostModeBody(mode)}\n${CLOSE}`
}

/** 只给 ACP 垫围栏；已有围栏不叠。Enjoy Local / 沙箱走 ToolLoop 系统提示。 */
export function applyHostModePrefix(
  isAcp: boolean,
  mode: ComposerVisibleMode,
  draft: string
): string {
  if (!isAcp) return draft
  if (extractHostModeFence(draft)) return draft
  const prefix = hostModePrefix(mode)
  if (!prefix) return draft
  return [prefix, draft.trim()].filter(Boolean).join("\n\n")
}

export function stripHostModePrefix(content: string): string {
  return content.replace(new RegExp(`${FENCE.source}\\s*`, "g"), "").trim()
}

export function extractHostModeFence(content: string): string {
  return content.match(FENCE)?.[0] ?? ""
}

const HOST_MODE_BODY: Record<Exclude<ComposerVisibleMode, "agent">, string> = {
  plan: "The host switched this session to plan mode. Investigate the workspace and write a concrete step-by-step implementation plan. Do not edit files or run mutating commands. Do not claim you are in normal or agent mode while this block is present.",
  ask: "The host switched this session to ask mode. Answer questions about the workspace. Read-only; do not edit files.",
  debug: "The host switched this session to debug mode. Diagnose the failure and propose the smallest robust fix."
}

function hostModeBody(mode: Exclude<ComposerVisibleMode, "agent">): string {
  return HOST_MODE_BODY[mode]
}
