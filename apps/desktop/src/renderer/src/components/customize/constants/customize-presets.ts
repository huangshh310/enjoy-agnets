/**
 * Agent 定制化预设：指令、技能包与项目规则模版。文案走 i18n。
 */
import {
  RiCodeSSlashLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { TranslateFn } from "@renderer/i18n"

export type InstructionPreset = {
  id: string
  label: string
  tag: string
  text: string
}

export type CuratedSkill = {
  id: string
  name: string
  category: string
  badge: string
  icon: typeof RiSparklingLine
  description: string
  slashCommand: string
  templateMarkdown: string
}

export type ProjectRulePreset = {
  id: string
  title: string
  targetFile: string
  category: string
  badge: string
  description: string
  content: string
}

/** 常用 System Prompt 行为指令预设 */
export function getInstructionPresets(t: TranslateFn): InstructionPreset[] {
  return [
    instructionPreset(t, "minimal-diffs", "minimalDiffs"),
    instructionPreset(t, "tdd-first", "tddFirst"),
    instructionPreset(t, "clean-arch", "cleanArch"),
    instructionPreset(t, "senior-pm-ux", "seniorPmUx")
  ]
}

/** 精选 Agent 技能包模版 (SKILL.md) */
export function getCuratedSkills(t: TranslateFn): CuratedSkill[] {
  return [
    curatedSkill(t, "web-search-researcher", "webSearch", RiSparklingLine),
    curatedSkill(t, "generative-ui-designer", "generativeUi", RiCodeSSlashLine),
    curatedSkill(t, "tdd-test-synthesizer", "tddSynth", RiShieldCheckLine),
    curatedSkill(t, "security-audit-scanner", "securityAudit", RiTerminalBoxLine)
  ]
}

/** 项目规范与 Cursor / AGENTS.md 规则模版 */
export function getProjectRules(t: TranslateFn): ProjectRulePreset[] {
  return [
    projectRule(t, "clean-diffs", "cleanDiffs", "AGENTS.md / .cursor/rules/clean-code.mdc"),
    projectRule(t, "strict-ts-zod", "strictTsZod", ".cursor/rules/typescript.mdc"),
    projectRule(t, "boardui-tokens", "boarduiTokens", ".cursor/rules/ui-tokens.mdc"),
    projectRule(t, "tdd-verification", "tddVerification", "AGENTS.md / .cursor/rules/testing.mdc")
  ]
}

function instructionPreset(t: TranslateFn, id: string, key: string): InstructionPreset {
  const base = `studio.instructionPresets.${key}`
  return {
    id,
    label: t(`${base}.label`),
    tag: t(`${base}.tag`),
    text: t(`${base}.text`)
  }
}

function curatedSkill(
  t: TranslateFn,
  id: string,
  key: string,
  icon: typeof RiSparklingLine
): CuratedSkill {
  const base = `studio.curatedSkills.${key}`
  return {
    id,
    name: t(`${base}.name`),
    category: t(`${base}.category`),
    badge: t(`${base}.badge`),
    icon,
    description: t(`${base}.description`),
    slashCommand: t(`${base}.slashCommand`),
    templateMarkdown: t(`${base}.template`)
  }
}

function projectRule(t: TranslateFn, id: string, key: string, targetFile: string): ProjectRulePreset {
  const base = `studio.projectRules.${key}`
  return {
    id,
    title: t(`${base}.title`),
    targetFile,
    category: t(`${base}.category`),
    badge: t(`${base}.badge`),
    description: t(`${base}.description`),
    content: t(`${base}.content`)
  }
}
