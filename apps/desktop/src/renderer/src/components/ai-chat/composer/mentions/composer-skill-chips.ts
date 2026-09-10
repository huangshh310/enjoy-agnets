/**
 * Composer 已钉的技能 Chip，以及最近一次扫到的技能目录（发送时匹配 /summarize）。
 */
import type { SkillItem } from "@enjoy-agents/ipc-contract"
import { skillWorkspaceRelPath } from "@enjoy-agents/ipc-contract/skills-catalog"
import { skillSlashToken, type SkillMention } from "./mention-items.ts"

export type { SkillMention }

let pending: SkillMention[] = []
let catalog: SkillMention[] = []
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function listComposerSkillChips(): SkillMention[] {
  return pending
}

export function addComposerSkillChip(skill: SkillMention) {
  pending = pending.filter((item) => item.id !== skill.id)
  pending.push(skill)
  notify()
}

export function removeComposerSkillChip(id: string) {
  pending = pending.filter((item) => item.id !== id)
  notify()
}

export function takeComposerSkillChips(): SkillMention[] {
  const taken = pending
  pending = []
  notify()
  return taken
}

export function setComposerSkillChips(skills: SkillMention[]) {
  pending = [...skills]
  notify()
}

export function subscribeComposerSkillChips(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function rememberSkillCatalog(skills: readonly SkillItem[], workspaceRoot?: string) {
  catalog = skills.map((skill) => toSkillMention(skill, workspaceRoot))
}

export function listKnownSkills(): SkillMention[] {
  return catalog
}

export function toSkillMention(skill: SkillItem, workspaceRoot?: string): SkillMention {
  return {
    id: skill.id || skill.directoryPath,
    name: skill.name.trim() || "skill",
    slash: skillSlashToken(skill),
    scope: skill.scope,
    description: skill.description,
    relPath: skillWorkspaceRelPath(skill.skillFilePath, workspaceRoot)
  }
}
