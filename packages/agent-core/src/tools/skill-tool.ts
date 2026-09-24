// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * 按需加载 SKILL.md。全局技能由宿主代读，不要求在工作区 jail 内。
 */
import { tool } from "ai"
import { z } from "zod"
import { clipToolText } from "./clip-tool-text.ts"

const MAX_SKILL_CHARS = 24_000

export type SkillCatalogEntry = {
  name: string
  description?: string
  scope: "global" | "workspace"
}

export type SkillHost = {
  list: () => SkillCatalogEntry[]
  read: (name: string) => Promise<{ name: string; scope: string; content: string }>
}

export function createSkillTool(host?: SkillHost) {
  return {
    skill: tool({
      description: skillToolDescription(host),
      inputSchema: z.object({
        name: z.string().describe("Skill name from the catalog")
      }),
      execute: async ({ name }: { name: string }) => {
        if (!host) return { error: "No skills are available in this session." }
        const loaded = await host.read(name.trim())
        return {
          name: loaded.name,
          scope: loaded.scope,
          content: clipToolText(loaded.content, MAX_SKILL_CHARS)
        }
      }
    })
  }
}

function skillToolDescription(host?: SkillHost): string {
  const entries = host?.list() ?? []
  if (entries.length === 0) {
    return "Load an installed skill by name. No skills are installed."
  }
  const lines = entries.slice(0, 48).map((item) => {
    const when = item.description?.replace(/\s+/g, " ").trim() ?? ""
    return `- ${item.name} (${item.scope})${when ? `: ${when.slice(0, 160)}` : ""}`
  })
  return [
    "Load a SKILL.md by name. Use this instead of read_file for skills, including global skills outside the workspace.",
    "<available_skills>",
    ...lines,
    "</available_skills>"
  ].join("\n")
}
