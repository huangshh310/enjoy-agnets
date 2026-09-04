/**
 * 技能来源 IPC 合约：来源分组、目标投影、doctor。
 * 与 skills.list/create 分离；频道前缀 skills.sources.*。
 */
import { z } from "zod"

export const SkillSourceKind = z.enum(["local", "git"])
export type SkillSourceKind = z.infer<typeof SkillSourceKind>

export const SkillTargetId = z.enum([
  "enjoy-agents",
  "agents",
  "claude",
  "codex",
  "cursor",
  "omp",
  "pi",
  "workspace-agents",
  "workspace-claude",
  "workspace-cursor",
  "workspace-skills",
  "workspace-dot-skills"
])
export type SkillTargetId = z.infer<typeof SkillTargetId>

export const SkillSourceHealth = z.enum(["ok", "drift", "missing", "error"])
export type SkillSourceHealth = z.infer<typeof SkillSourceHealth>

export const SkillSource = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: SkillSourceKind,
    origin: z.string(),
    selectedSkillIds: z.array(z.string()),
    enabledTargetIds: z.array(SkillTargetId),
    health: SkillSourceHealth,
    warningCount: z.number().int(),
    skillCount: z.number().int()
  })
  .strict()
export type SkillSource = z.infer<typeof SkillSource>

export const SkillSourceSkill = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    relativeDir: z.string(),
    skillFilePath: z.string().optional(),
    trigger: z.string().optional(),
    content: z.string().optional()
  })
  .strict()
export type SkillSourceSkill = z.infer<typeof SkillSourceSkill>

export const SkillSourceWarning = z
  .object({
    sourceId: z.string(),
    code: z.string(),
    message: z.string()
  })
  .strict()
export type SkillSourceWarning = z.infer<typeof SkillSourceWarning>

export const SkillSourceOverview = z
  .object({
    sources: z.array(SkillSource),
    installedCount: z.number().int(),
    driftCount: z.number().int()
  })
  .strict()
export type SkillSourceOverview = z.infer<typeof SkillSourceOverview>

export const SkillSourceAddInput = z
  .object({
    kind: SkillSourceKind,
    origin: z.string().min(1),
    name: z.string().optional()
  })
  .strict()
export type SkillSourceAddInput = z.infer<typeof SkillSourceAddInput>

export const SkillSourceIdInput = z
  .object({
    sourceId: z.string().min(1)
  })
  .strict()
export type SkillSourceIdInput = z.infer<typeof SkillSourceIdInput>

export const SkillSourceConfigureInput = z
  .object({
    sourceId: z.string().min(1),
    selectedSkillIds: z.array(z.string()),
    enabledTargetIds: z.array(SkillTargetId)
  })
  .strict()
export type SkillSourceConfigureInput = z.infer<typeof SkillSourceConfigureInput>

export const SkillSourceDeployInput = z
  .object({
    sourceId: z.string().min(1)
  })
  .strict()
export type SkillSourceDeployInput = z.infer<typeof SkillSourceDeployInput>

export const SkillSourceDeleteSkillInput = z
  .object({
    sourceId: z.string().min(1),
    skillId: z.string().min(1)
  })
  .strict()
export type SkillSourceDeleteSkillInput = z.infer<typeof SkillSourceDeleteSkillInput>

export const SkillSourceDetail = z
  .object({
    source: SkillSource,
    skills: z.array(SkillSourceSkill)
  })
  .strict()
export type SkillSourceDetail = z.infer<typeof SkillSourceDetail>
export const CuratedSkillSource = z
  .object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    author: z.string(),
    locator: z.string(),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    stars: z.number().int().optional(),
    skillCount: z.number().int().optional(),
    featuredSkills: z.array(z.string())
  })
  .strict()
export type CuratedSkillSource = z.infer<typeof CuratedSkillSource>

export const SkillSourceRepairInput = z
  .object({
    sourceId: z.string().optional()
  })
  .strict()
export type SkillSourceRepairInput = z.infer<typeof SkillSourceRepairInput>
