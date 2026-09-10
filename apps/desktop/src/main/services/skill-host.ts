/**
 * ToolLoop skill 工具宿主：列表 + 代读 SKILL.md（含全局技能）。
 */
import type { SkillHost } from "@enjoy-agents/agent-core"
import { listInstalledSkills, readSkillContent } from "./skills-service"

export function createSkillHost(workspaceRoot: string): SkillHost {
  return {
    list: () =>
      listInstalledSkills({ workspacePath: workspaceRoot }).map((skill) => ({
        name: skill.name,
        description: skill.description,
        scope: skill.scope
      })),
    read: async (name) => {
      const match = findSkill(workspaceRoot, name)
      if (!match) throw new Error(`Unknown skill: ${name}`)
      const roots = match.scope === "workspace" ? [workspaceRoot] : []
      return {
        name: match.name,
        scope: match.scope,
        content: readSkillContent(match.skillFilePath, roots)
      }
    }
  }
}

function findSkill(workspaceRoot: string, name: string) {
  const needle = name.trim().toLowerCase()
  return listInstalledSkills({ workspacePath: workspaceRoot }).find((skill) => {
    return skill.name.toLowerCase() === needle || skill.trigger?.toLowerCase() === needle
  })
}
