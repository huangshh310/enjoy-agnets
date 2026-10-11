/**
 * 发送前给 Chip 拍快照：引用、技能、知识 Chip 与附件。发送失败要原样还回去，不能只还正文。
 */
import { listComposerSkillChips, setComposerSkillChips } from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import type { SkillMention } from "../../components/ai-chat/composer/mentions/mention-items.ts"
import { listComposerAssets, type QueuedComposerAsset } from "../composer-assets"
import { listQuotedContexts, setQuotedContexts, type QuotedContext } from "../quoted-context"
import {
  listSessionContextChips,
  setSessionContextChips,
  type SessionContextChip
} from "../session-context-chips"

export type ComposerSendSnapshot = {
  /** 输入框里的原文，不是拼了引用 / 前缀的 content。 */
  text: string
  quotes: QuotedContext[]
  skills: SkillMention[]
  contextChips: SessionContextChip[]
  assets: QueuedComposerAsset[]
}

export function captureComposerSend(text: string): ComposerSendSnapshot {
  return {
    text,
    quotes: [...listQuotedContexts()],
    skills: [...listComposerSkillChips()],
    contextChips: [...listSessionContextChips()],
    assets: listComposerAssets()
  }
}

export function preparedSendSnapshot(text: string, assets?: QueuedComposerAsset[]): ComposerSendSnapshot {
  return { text, quotes: [], skills: [], contextChips: [], assets: assets ?? [] }
}

/** 只还 Chip；正文与附件由 restoreComposerDraft 合并，避免重复。已有同 id 的不叠。 */
export function restoreComposerSendChips(snapshot: ComposerSendSnapshot): void {
  if (snapshot.quotes.length > 0) setQuotedContexts(mergeById(listQuotedContexts(), snapshot.quotes))
  if (snapshot.skills.length > 0) setComposerSkillChips(mergeById(listComposerSkillChips(), snapshot.skills))
  if (snapshot.contextChips.length > 0) {
    setSessionContextChips(mergeById(listSessionContextChips(), snapshot.contextChips))
  }
}

function mergeById<T extends { id: string }>(current: T[], restored: T[]): T[] {
  const seen = new Set(current.map((item) => item.id))
  return [...restored.filter((item) => !seen.has(item.id)), ...current]
}
