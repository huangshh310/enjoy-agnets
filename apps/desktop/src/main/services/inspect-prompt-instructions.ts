/**
 * 开流 / 检查器看到的系统指令。
 * Enjoy Local：systemPromptFor + 自定义说明 + 常驻规则 + 技能索引。
 * Harness：systemPromptFor + 自定义说明。
 * ACP：不假装走 ToolLoop 提示词，只展示将垫进 session/prompt 的自定义说明。
 */
import { joinInstructions, systemPromptFor } from "@enjoy-agents/agent-core/prompts"
import { formatAlwaysOnRulePrompt } from "@enjoy-agents/ipc-contract/rules-always-on"
import { formatSkillCatalog } from "@enjoy-agents/ipc-contract/skills-catalog"
import type { AgentMode, InspectPromptResult, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"

const CUSTOM_HEAD = "# User custom instructions"

const ACP_INSPECT_NOTE = [
  "ACP host: Enjoy does not inject ToolLoop systemPromptFor.",
  "Custom instructions are prepended to session/prompt.",
  "Workspace AGENTS.md / CLAUDE.md / skills are read by the CLI from disk."
].join(" ")

export type LocalInstructionExtras = {
  customInstructions: string
  rules?: readonly ProjectRuleItem[]
  skills?: readonly SkillItem[]
  workspaceRoot?: string
}

export function formatCustomInstructions(text: string): string {
  const extra = text.trim()
  return extra ? `${CUSTOM_HEAD}\n${extra}` : ""
}

/** 本机 ToolLoop 除 mode 提示词以外的尾巴。 */
/** ACP / e2e 不列 Enjoy ToolLoop 写工具名，避免检查器假装本机有 write_file。 */
export function inspectListedToolNames(
  runtime: InspectPromptResult["runtime"],
  localNames: readonly string[]
): string[] {
  if (runtime === "acp-host" || runtime === "e2e") return []
  return [...localNames]
}

export function extraLocalInstructions(input: LocalInstructionExtras): string {
  return [
    formatCustomInstructions(input.customInstructions),
    formatAlwaysOnRulePrompt(input.rules ?? []),
    formatSkillCatalog(input.skills ?? [], { workspaceRoot: input.workspaceRoot })
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function codingInstructions(
  mode: AgentMode,
  runtime: InspectPromptResult["runtime"],
  customInstructions: string,
  rules: readonly ProjectRuleItem[] = [],
  extras?: Pick<LocalInstructionExtras, "skills" | "workspaceRoot">
): string {
  if (runtime === "e2e") return systemPromptFor(mode)
  if (runtime === "acp-host") {
    const custom = formatCustomInstructions(customInstructions)
    return joinInstructions(ACP_INSPECT_NOTE, custom)
  }
  const base = systemPromptFor(mode)
  if (runtime === "harness") {
    return joinInstructions(base, formatCustomInstructions(customInstructions))
  }
  return joinInstructions(
    base,
    extraLocalInstructions({
      customInstructions,
      rules,
      skills: extras?.skills,
      workspaceRoot: extras?.workspaceRoot
    })
  )
}
