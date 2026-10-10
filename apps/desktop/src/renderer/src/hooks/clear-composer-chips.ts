/**
 * Composer 全选删除：正文在 textarea，@ 文件 / 技能 / 知识 Chip 是兄弟节点。
 * Ctrl+A 只圈中文字，Backspace / Delete 在整段选中时必须一并清掉 Chip。
 */
import { setQuotedContexts } from "./quoted-context.ts"
import { setSessionContextChips } from "./session-context-chips.ts"
import { setComposerSkillChips } from "../components/ai-chat/composer/mentions/composer-skill-chips.ts"

export type ComposerSelectionTarget = {
  value: string
  selectionStart: number | null
  selectionEnd: number | null
}

export function entireTextSelected(target: ComposerSelectionTarget): boolean {
  const start = target.selectionStart ?? 0
  const end = target.selectionEnd ?? 0
  return start === 0 && end === target.value.length
}

export function isComposerChipDeleteKey(key: string): boolean {
  return key === "Backspace" || key === "Delete"
}

export function shouldClearComposerChipsOnDelete(
  key: string,
  target: ComposerSelectionTarget
): boolean {
  return isComposerChipDeleteKey(key) && entireTextSelected(target)
}

export function clearComposerDraftChips(): void {
  setQuotedContexts([])
  setComposerSkillChips([])
  setSessionContextChips([])
}
