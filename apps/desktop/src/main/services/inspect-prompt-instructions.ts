/**
 * 开流 / 检查器看到的系统指令。
 * Enjoy Local：systemPromptFor + 自定义说明 + AGENTS.md 链 + 其余常驻规则 + 技能索引。
 * Harness：systemPromptFor + 自定义说明。
 * ACP：不假装走 ToolLoop 提示词；展示将垫进 session/prompt 的自定义说明与技能索引。
 */
import { joinInstructions, systemPromptFor } from "@enjoy-agents/agent-core/prompts"
import {
  isAgentsChainFilePath,
  REHYDRATED_INSTRUCTIONS_NOTE
} from "@enjoy-agents/ipc-contract/agents-md-chain"
import { formatAlwaysOnRulePrompt } from "@enjoy-agents/ipc-contract/rules-always-on"
import { formatSkillCatalog } from "@enjoy-agents/ipc-contract/skills-catalog"
import type { AgentMode, InspectPromptResult, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"

const CUSTOM_HEAD = "# User custom instructions"

const ACP_INSPECT_NOTE = [
  "ACP host: Enjoy does not inject ToolLoop systemPromptFor.",
  "Custom instructions and the host skill catalog are prepended to session/prompt.",
  "Trusted #/mcp servers are passed on session/new.",
  "Workspace AGENTS.md / CLAUDE.md are still read by the CLI from disk."
].join(" ")

export type LocalInstructionExtras = {
  customInstructions: string
  rules?: readonly ProjectRuleItem[]
  skills?: readonly SkillItem[]
  workspaceRoot?: string
  outline?: string
  executePlan?: string
  agentsMd?: string
  rehydratedAfterCompact?: boolean
}

export function formatCustomInstructions(text: string): string {
  const extra = text.trim()
  return extra ? `${CUSTOM_HEAD}\n${extra}` : ""
}

/** ACP / e2e 不列 Enjoy ToolLoop 写工具名，避免检查器假装本机有 write_file。 */
export function inspectListedToolNames(
  runtime: InspectPromptResult["runtime"],
  localNames: readonly string[]
): string[] {
  if (runtime === "acp-host" || runtime === "e2e") return []
  return [...localNames]
}

export function extraLocalInstructions(input: LocalInstructionExtras): string {
  const chain = input.agentsMd?.trim() ?? ""
  // 链已经按层拼过；再走 always-on 会把根 AGENTS.md 灌第二遍。
  const rules = chain
    ? (input.rules ?? []).filter((rule) => !isAgentsChainFilePath(rule.filePath))
    : (input.rules ?? [])
  return [
    input.rehydratedAfterCompact ? REHYDRATED_INSTRUCTIONS_NOTE : "",
    formatCustomInstructions(input.customInstructions),
    chain,
    formatAlwaysOnRulePrompt(rules),
    formatSkillCatalog(input.skills ?? [], { workspaceRoot: input.workspaceRoot }),
    input.outline?.trim() ?? "",
    input.executePlan?.trim() ?? ""
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function codingInstructions(
  mode: AgentMode,
  runtime: InspectPromptResult["runtime"],
  customInstructions: string,
  rules: readonly ProjectRuleItem[] = [],
  extras?: Pick<LocalInstructionExtras, "skills" | "workspaceRoot" | "agentsMd" | "rehydratedAfterCompact">
): string {
  if (runtime === "e2e") return systemPromptFor(mode)
  if (runtime === "acp-host") {
    const custom = formatCustomInstructions(customInstructions)
    const skills = formatSkillCatalog(extras?.skills ?? [], { workspaceRoot: extras?.workspaceRoot })
    return joinInstructions(joinInstructions(ACP_INSPECT_NOTE, custom), skills)
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
      workspaceRoot: extras?.workspaceRoot,
      agentsMd: extras?.agentsMd,
      rehydratedAfterCompact: extras?.rehydratedAfterCompact
    })
  )
}
