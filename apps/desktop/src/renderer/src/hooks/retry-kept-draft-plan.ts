/**
 * 红卡 / 白卡「再发一次」怎么走（纯判定，便于测）。
 * jojo P2（#136 r4 产品决定）：只重发**被留下的那一句**（字 + 它自己的附件），恰好一条消息；
 * 输入框里新打的字 / 新贴的图是用户的下一条草稿——不自动另发、不并进重发、不清掉。
 * - 本会话刚回滚过、记着还回的那一句 → resend-kept（重发那一句，再把它从输入框摘掉，新草稿原样留着）；
 * - 用户句还在线程里、后面没有助手（keptUserMessage）→ retry-turn（原地重跑那一句，带它自己的附件）；
 * - 都没有（闸拦：输入框从没清空过，草稿就是整个输入框）→ 输入框有字或有图才 send；
 * - 否则 none。
 */
import { composerCanSend } from "./runtime-interact/composer-can-send.ts"

export type RetryKeptDraftPlan = "resend-kept" | "retry-turn" | "send" | "none"

export function retryKeptDraftPlan(input: {
  kept: { text: string; assetCount: number } | null
  lastUserPending: boolean
  composer: string
  composerAssetCount: number
}): RetryKeptDraftPlan {
  if (input.kept && (input.kept.text.trim() || input.kept.assetCount > 0)) return "resend-kept"
  if (input.lastUserPending) return "retry-turn"
  if (composerCanSend({ text: input.composer, assetCount: input.composerAssetCount })) return "send"
  return "none"
}

/** 把还回的那一句从输入框全文里摘掉（还稿时与后打的字按行合并过），剩下的是下一条草稿。 */
export function composerWithoutKept(current: string, kept: string): string {
  const sentence = kept.trim()
  if (!sentence) return current
  const at = current.indexOf(sentence)
  if (at < 0) return current
  const before = current.slice(0, at).replace(/\s+$/, "")
  const after = current.slice(at + sentence.length).replace(/^\s+/, "")
  return before && after ? `${before}\n${after}` : before || after
}
