/**
 * Agent Skills frontmatter 规范校验（对齐 agentskills.io）。
 * `allowed-tools` 仅作展示元数据，绝不进入审批 / Always-allow。
 * 非标 `trigger` 不进必填集合。
 */
import { z } from "zod"

/** Agent Skills name：1–64 · 仅 [a-z0-9-] · 不首尾 - · 无连续 -- */
export const AGENT_SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const AGENT_SKILL_NAME_MAX = 64
export const AGENT_SKILL_DESCRIPTION_MAX = 1024
export const AGENT_SKILL_COMPATIBILITY_MAX = 500

/** 接近满额才 warn 的阈值（luna 像素锁） */
export const AGENT_SKILL_NAME_WARN_AT = 56
export const AGENT_SKILL_DESCRIPTION_WARN_AT = 960

export const SkillFrontmatterIssueCode = z.enum([
  "name_empty",
  "name_charset",
  "name_edge_hyphen",
  "name_double_hyphen",
  "name_too_long",
  "description_empty",
  "description_too_long",
  "compatibility_too_long"
])
export type SkillFrontmatterIssueCode = z.infer<typeof SkillFrontmatterIssueCode>

export const SkillFrontmatterIssue = z
  .object({
    path: z.enum(["name", "description", "compatibility"]),
    code: SkillFrontmatterIssueCode,
    message: z.string().min(1)
  })
  .strict()
export type SkillFrontmatterIssue = z.infer<typeof SkillFrontmatterIssue>

export const SkillFrontmatterValidation = z
  .object({
    ok: z.boolean(),
    issues: z.array(SkillFrontmatterIssue)
  })
  .strict()
export type SkillFrontmatterValidation = z.infer<typeof SkillFrontmatterValidation>

export type SkillFrontmatterFields = {
  name?: string | null
  description?: string | null
  compatibility?: string | null
}

/** 写入门闩用的 Agent Skills name（禁 `_`）。 */
export const AgentSkillName = z
  .string()
  .min(1)
  .max(AGENT_SKILL_NAME_MAX)
  .regex(AGENT_SKILL_NAME_RE, "name: 仅小写字母数字与单连字符，不首尾连字符、无连续 --")

export const AgentSkillDescription = z.string().min(1).max(AGENT_SKILL_DESCRIPTION_MAX)

export const AgentSkillCompatibility = z.string().min(1).max(AGENT_SKILL_COMPATIBILITY_MAX).optional()

/** 展示元数据 —— 绝不进入 resolveToolApproval / Always-allow。 */
export const AllowedToolsDisplay = z.string().optional()

function issue(
  path: SkillFrontmatterIssue["path"],
  code: SkillFrontmatterIssueCode,
  message: string
): SkillFrontmatterIssue {
  return { path, code, message }
}

/** 名称人话 hint（luna 优先级互斥）。 */
export function skillNameHint(raw: string | null | undefined): string | null {
  const name = (raw ?? "").trim()
  if (!name) return "请填写技能英文标识"
  if (name.length > AGENT_SKILL_NAME_MAX) return "名称最多 64 个字符"
  if (name.startsWith("-") || name.endsWith("-")) return "名称不能以连字符开头或结尾"
  if (name.includes("--")) return "名称里不能有连续两个连字符"
  if (!AGENT_SKILL_NAME_RE.test(name)) return "名称只能用小写字母、数字和连字符"
  return null
}

/** 描述人话 hint。 */
export function skillDescriptionHint(raw: string | null | undefined): string | null {
  const description = raw ?? ""
  if (!description.trim()) return "请填写功能描述"
  if (description.length > AGENT_SKILL_DESCRIPTION_MAX) return "描述最多 1024 个字符"
  return null
}

/**
 * 校验 frontmatter 字段集。
 * 注意：不校验 `trigger`（本地呼号）；不把 `allowed-tools` 当批准。
 */
export function validateSkillFrontmatter(fields: SkillFrontmatterFields): SkillFrontmatterValidation {
  const issues: SkillFrontmatterIssue[] = []
  const name = fields.name == null ? "" : String(fields.name).trim()
  const description = fields.description == null ? "" : String(fields.description)
  const compatibility =
    fields.compatibility == null || fields.compatibility === ""
      ? undefined
      : String(fields.compatibility)

  const nameHint = skillNameHint(name)
  if (nameHint) {
    let code: SkillFrontmatterIssueCode = "name_charset"
    if (!name) code = "name_empty"
    else if (name.length > AGENT_SKILL_NAME_MAX) code = "name_too_long"
    else if (name.startsWith("-") || name.endsWith("-")) code = "name_edge_hyphen"
    else if (name.includes("--")) code = "name_double_hyphen"
    issues.push(issue("name", code, nameHint))
  }

  const descHint = skillDescriptionHint(description)
  if (descHint) {
    const code: SkillFrontmatterIssueCode =
      !description.trim() ? "description_empty" : "description_too_long"
    issues.push(issue("description", code, descHint))
  }

  if (compatibility != null && compatibility.length > AGENT_SKILL_COMPATIBILITY_MAX) {
    issues.push(
      issue("compatibility", "compatibility_too_long", "compatibility 最多 500 个字符")
    )
  }

  return { ok: issues.length === 0, issues }
}

/** 列表 mute 旁注短标签（禁 FAIL / 损坏 / 即将删除）。 */
export function skillFrontmatterListNotes(issues: readonly SkillFrontmatterIssue[]): string[] {
  const notes: string[] = []
  const seen = new Set<string>()
  for (const row of issues) {
    let label: string | null = null
    if (row.path === "name") label = "名称不合规"
    else if (row.code === "description_empty") label = "缺描述"
    else if (row.code === "description_too_long") label = "描述过长"
    else if (row.path === "compatibility") label = "compatibility 过长"
    if (label && !seen.has(label)) {
      seen.add(label)
      notes.push(label)
    }
  }
  return notes
}

/** 详情规范 chip 文案。 */
export function skillFrontmatterIssueChip(issueRow: SkillFrontmatterIssue): string {
  switch (issueRow.code) {
    case "name_empty":
      return "name · 缺"
    case "name_charset":
      return "name · 含非法字符"
    case "name_edge_hyphen":
      return "name · 首尾连字符"
    case "name_double_hyphen":
      return "name · 连续连字符"
    case "name_too_long":
      return "name · 超长"
    case "description_empty":
      return "description · 缺"
    case "description_too_long":
      return "description · 超长"
    case "compatibility_too_long":
      return "compatibility · 超长"
    default:
      return `${issueRow.path} · 不合规`
  }
}
