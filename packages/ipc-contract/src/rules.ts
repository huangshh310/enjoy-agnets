/**
 * 多 Agent 项目规则 (Rules) IPC 合约与类型定义：
 * 深度兼容 Enjoy AGENTS.md, Claude Code (CLAUDE.md), Cursor (.cursor/rules/*.mdc), 
 * GitHub Copilot (copilot-instructions.md), Windsurf (.windsurfrules) 等生态。
 */
import { z } from "zod"

export const AgentRuleKind = z.enum([
  "agents_md",
  "claude_md",
  "cursor_mdc",
  "cursorrules",
  "copilot",
  "windsurf",
  "codex",
  "global"
])
export type AgentRuleKind = z.infer<typeof AgentRuleKind>

export const RuleScope = z.enum(["global", "workspace", "contextual"])
export type RuleScope = z.infer<typeof RuleScope>

export const ProjectRuleItem = z.object({
  id: z.string(),
  name: z.string(),
  agentKind: AgentRuleKind,
  agentKindLabel: z.string(),
  scope: RuleScope,
  filePath: z.string(),
  globs: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional()
})
export type ProjectRuleItem = z.infer<typeof ProjectRuleItem>

export const RuleListInput = z
  .object({
    workspacePath: z.string().optional()
  })
  .strict()
export type RuleListInput = z.infer<typeof RuleListInput>

export const RuleReadInput = z
  .object({
    filePath: z.string().min(1)
  })
  .strict()
export type RuleReadInput = z.infer<typeof RuleReadInput>

export const RuleCreateInput = z
  .object({
    targetKind: AgentRuleKind,
    name: z.string().min(1),
    description: z.string().optional(),
    globs: z.string().optional(),
    content: z.string().min(1),
    workspacePath: z.string().optional()
  })
  .strict()
export type RuleCreateInput = z.infer<typeof RuleCreateInput>

export const RuleDeleteInput = z
  .object({
    filePath: z.string().min(1)
  })
  .strict()
export type RuleDeleteInput = z.infer<typeof RuleDeleteInput>

export const RuleRevealInput = z
  .object({
    filePath: z.string().min(1)
  })
  .strict()
export type RuleRevealInput = z.infer<typeof RuleRevealInput>
