/**
 * Agent 技能包 (Skills) IPC 合约与类型定义：
 * 支持自动扫描全局与工作区目录、读取 YAML Frontmatter 与安装模版。
 * frontmatter 写入门闩对齐 Agent Skills；`allowedTools` 仅展示。
 */
import { z } from "zod"
import {
  AgentSkillDescription,
  AgentSkillName,
  AllowedToolsDisplay,
  SkillFrontmatterIssue
} from "./skill-frontmatter.ts"

export const SkillScope = z.enum(["global", "workspace"])
export type SkillScope = z.infer<typeof SkillScope>

export const SkillItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  scope: SkillScope,
  directoryPath: z.string(),
  skillFilePath: z.string(),
  /** 非标本地呼号 —— 不进 Agent Skills 必填 / 授权。 */
  trigger: z.string().optional(),
  content: z.string().optional(),
  /** 规范问题列表（已装旁注）；不合规仍可列，不删盘。 */
  issues: z.array(SkillFrontmatterIssue).optional(),
  /**
   * frontmatter `allowed-tools` 展示字符串（若有）。
   * 仅 UI 元数据；绝不传入 resolveToolApproval / Always-allow / 预批。
   */
  allowedTools: AllowedToolsDisplay
})
export type SkillItem = z.infer<typeof SkillItem>

export const SkillListInput = z
  .object({
    workspacePath: z.string().optional()
  })
  .strict()
export type SkillListInput = z.infer<typeof SkillListInput>

/** 新建/导入写入门闩：name/description 对齐 Agent Skills；禁 `_`。 */
export const SkillCreateInput = z
  .object({
    name: AgentSkillName,
    description: AgentSkillDescription,
    scope: SkillScope,
    workspacePath: z.string().optional(),
    content: z.string().optional()
  })
  .strict()
export type SkillCreateInput = z.infer<typeof SkillCreateInput>

export const SkillDeleteInput = z
  .object({
    directoryPath: z.string().min(1)
  })
  .strict()
export type SkillDeleteInput = z.infer<typeof SkillDeleteInput>

export const SkillRevealInput = z
  .object({
    directoryPath: z.string().min(1)
  })
  .strict()
export type SkillRevealInput = z.infer<typeof SkillRevealInput>

export const SkillReadInput = z
  .object({
    skillFilePath: z.string().min(1)
  })
  .strict()
export type SkillReadInput = z.infer<typeof SkillReadInput>
