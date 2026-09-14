/**
 * 选中的技能变成 Prompt 指令：指向 SKILL.md 路径，不灌正文。
 */
import type { SkillMention } from "./mention-items.ts"

export function formatSkillMention(skill: SkillMention): string {
  const title = skill.slash ? `/${skill.slash}` : skill.name
  if (skill.relPath) {
    return [
      `Follow the installed skill ${title} (${skill.name}).`,
      `Workspace path: ${skill.relPath}`,
      "Read that SKILL.md before acting. Do not guess the instructions."
    ].join("\n")
  }
  return [
    `Follow the installed skill ${title} (${skill.name}).`,
    "This skill is outside the opened folder.",
    "Use the catalog description; do not invent a path outside the workspace."
  ].join("\n")
}

export function formatSkillMentions(skills: readonly SkillMention[]): string {
  return skills.map(formatSkillMention).filter(Boolean).join("\n\n")
}
