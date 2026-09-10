/**
 * Enjoy Local 只注入技能索引：名称、何时用、工作区内路径。
 * 不灌 SKILL.md 正文。工作区外技能没有 read_file 路径。
 */
import type { SkillItem } from "./skills.ts"

export const SKILL_CATALOG_CHAR_BUDGET = 8_000
export const SKILL_CATALOG_MAX_ITEMS = 48

const HEADER = [
  "# Installed skills (index)",
  "If a skill matches the task, call the skill tool with its name. That loads SKILL.md, including global skills outside the workspace.",
  "Do not invent a path outside the workspace. Prefer skill over read_file for skills."
].join("\n")

export function skillWorkspaceRelPath(
  skillFilePath: string,
  workspaceRoot?: string
): string | undefined {
  if (!workspaceRoot?.trim() || !skillFilePath.trim()) return undefined
  const root = workspaceRoot.replace(/\\/g, "/").replace(/\/+$/, "")
  const file = skillFilePath.replace(/\\/g, "/")
  if (!file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return undefined
  const rel = file.slice(root.length + 1)
  if (!rel || rel.split("/").includes("..")) return undefined
  return rel
}

/** 拼进系统提示的技能目录；调用方传入 listInstalledSkills 即可。 */
export function formatSkillCatalog(
  skills: readonly SkillItem[],
  options?: { workspaceRoot?: string; budget?: number }
): string {
  const budget = options?.budget ?? SKILL_CATALOG_CHAR_BUDGET
  const selected = pickSkillCatalog(skills)
  if (selected.length === 0) return ""
  let remaining = Math.max(0, budget - HEADER.length - 2)
  const parts = [HEADER]
  let omitted = 0
  for (let index = 0; index < selected.length; index += 1) {
    const block = formatSkillEntry(selected[index]!, options?.workspaceRoot)
    if (!block) continue
    if (block.length + 2 <= remaining) {
      parts.push(block)
      remaining -= block.length + 2
      continue
    }
    omitted = selected.length - index
    break
  }
  if (omitted > 0) {
    parts.push(`[truncated: ${omitted} skill(s) exceeded catalog budget]`)
  }
  return parts.length > 1 ? parts.join("\n\n") : ""
}

export function pickSkillCatalog(skills: readonly SkillItem[]): SkillItem[] {
  const seen = new Set<string>()
  const unique: SkillItem[] = []
  for (const skill of skills) {
    const key = skill.directoryPath.replace(/\\/g, "/").toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(skill)
  }
  return unique.sort(compareSkillCatalog).slice(0, SKILL_CATALOG_MAX_ITEMS)
}

function formatSkillEntry(skill: SkillItem, workspaceRoot?: string): string {
  const name = skill.name.trim() || "skill"
  const trigger = skill.trigger?.trim()
  const rel = skillWorkspaceRelPath(skill.skillFilePath, workspaceRoot)
  const when = clipDescription(skill.description ?? "")
  const lines = [
    `- ${name} (${skill.scope})${trigger ? ` trigger: ${trigger}` : ""}`,
    rel ? `  path: ${rel}` : "  path: (outside workspace)",
    when ? `  Use when: ${when}` : ""
  ]
  return lines.filter(Boolean).join("\n")
}

function clipDescription(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim()
  if (oneLine.length <= 200) return oneLine
  return `${oneLine.slice(0, 199)}…`
}

function compareSkillCatalog(left: SkillItem, right: SkillItem): number {
  if (left.scope !== right.scope) return left.scope === "workspace" ? -1 : 1
  return left.name.localeCompare(right.name)
}
