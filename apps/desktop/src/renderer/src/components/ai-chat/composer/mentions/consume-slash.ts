/**
 * 发送时消化句首 /：先切模式 / compact，再匹配已安装技能。未知斜杠原样留下。
 */
import { slashAliasToMode, type ComposerVisibleMode } from "../composer-mode.ts"
import type { SkillMention } from "./mention-items.ts"

export type LeadingSlashResult = {
  mode?: ComposerVisibleMode
  skill?: SkillMention
  command?: "compact"
  text: string
}

const LEADING = /^\/([A-Za-z][\w.-]*)(?:\s+([\s\S]*))?$/

/** 句首 `/explore` `/execute`（及内部别名）切模式；`/compact` 压缩；未知 `/web` 不剥。 */
export function applyLeadingSlash(text: string, skills: readonly SkillMention[]): LeadingSlashResult {
  const trimmed = text.trim()
  const match = trimmed.match(LEADING)
  if (!match) return { text }
  const token = match[1] ?? ""
  const rest = (match[2] ?? "").trim()
  const mode = slashAliasToMode(token)
  if (mode) {
    return { mode, text: rest }
  }
  if (token.toLowerCase() === "compact") {
    return { command: "compact", text: rest }
  }
  const skill = matchSkillSlash(token, skills)
  if (!skill) return { text }
  return { skill, text: rest }
}

function matchSkillSlash(token: string, skills: readonly SkillMention[]): SkillMention | undefined {
  const needle = token.toLowerCase()
  return skills.find((skill) => {
    if (skill.slash?.toLowerCase() === needle) return true
    return skill.name.replace(/\s+/g, "").toLowerCase() === needle
  })
}
