/**
 * Agent 技能包 (Skills) IPC 合约与类型定义：
 * 支持自动扫描全局与工作区目录、读取 YAML Frontmatter 与安装模版。
 */
import { z } from "zod"

export const SkillScope = z.enum(["global", "workspace"])
export type SkillScope = z.infer<typeof SkillScope>

export const SkillItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  scope: SkillScope,
  directoryPath: z.string(),
  skillFilePath: z.string(),
  trigger: z.string().optional(),
  content: z.string().optional()
})
export type SkillItem = z.infer<typeof SkillItem>

export const SkillListInput = z
  .object({
    workspacePath: z.string().optional()
  })
  .strict()
export type SkillListInput = z.infer<typeof SkillListInput>

export const SkillCreateInput = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
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
