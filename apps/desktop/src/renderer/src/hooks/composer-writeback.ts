/**
 * 把一段稿（正文 + 图 + 引用 / 技能 Chip）写回输入框，**不冲掉用户已经打的东西**。
 *
 * 为什么要单独一层：建会话 / 入队的回写锁期间（以及输入法组字时）store.composer 落后于输入框 DOM，
 * 只看 store 判「空」再 setComposer 会把用户刚打的字冲掉（leo BLOCK #163 ④ / probe P5）。
 * 这里一律以 DOM 为准（readComposerDomText，取不到 DOM 才回落 store），Chip / 附件看各自的模块状态。
 *
 * 用法（#163 排队「改一下再发 / 退回输入框」在用；#159 F1 回退还稿也接这里）：
 *   const r = writeBackToComposer({ text, assets, quotedContexts, skillChips }, { mode: "refuse" })
 *   if (!r.ok) …  // 输入框里有东西（或正在组字），什么都没写；调用方别把源数据拿走 / 丢掉
 *
 * - mode "refuse"：输入框有任何内容（正文非空白 / 附件 / 引用 / 技能 / 知识 Chip）或正在组字 → 不写，返回 { ok:false }。
 * - mode "merge"：正文按 mergeWritebackText(写回的, 输入框现有的) 合并——现有在前，**只用一个换行**接上；
 *   按整行去重：输入框里已有同一段（逐行去首尾空白后连续相同）就不再追加，同一段写回两次也只出现一次
 *   （#159 F1 / leo：失败稿被写回两遍且没有分隔，变成「billing firstqueued two」）。
 *   附件按 id、Chip 按内容去重后追加（附件走 queueComposerAsset，和手贴一样落草稿存档）。只在正在组字时拒绝（不打断输入法）。
 * - expectSessionId：调用方的那一轮属于哪个会话；前台已换会话（中间有 await，#159 F1 回退还稿）→ 不写，
 *   返回 { ok:false, reason:"session-changed" }，不把别的会话的稿写进当前输入框。
 * - 回写锁（建会话 / 入队期间 setComposerWritebackHeld / 建会话未完成）：两种 mode 都不写，返回 reason "writeback-held"
 *   （这时输入框正被发送流程接管，强写会被清稿冲掉或并进正在发的那一条）。
 * - 写入：store.setComposer + 强制同步 DOM（读的就是 DOM，强写不会丢字）；不动回写锁；focus 默认 true（光标放末尾）。
 * - 纯同步函数，无 IPC；不碰排队队列 / 草稿持久化，调用方自己决定先查后取（refuse 时用 canWriteBackToComposer 先问）。
 */
import { useChatStore } from "../stores/chat-store"
import { readComposerDomText, syncComposerDom } from "./composer-dom"
import { isComposerComposing } from "./composer-ime"
import { isComposerWritebackHeld } from "./composer-sync-lock"
import { isNewSessionCreatePending } from "./new-session-create"
import { listComposerAssets, queueComposerAsset, type QueuedComposerAsset } from "./composer-assets"
import { listQuotedContexts, setQuotedContexts, type QuotedContext } from "./quoted-context"
import {
  listComposerSkillChips,
  setComposerSkillChips,
  type SkillMention
} from "../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import { composerHasExtras } from "./composer-draft-extras"
import { focusComposerEnd } from "./composer-focus"

export type ComposerWritebackContent = {
  text: string
  assets?: readonly QueuedComposerAsset[]
  quotedContexts?: readonly QuotedContext[]
  skillChips?: readonly SkillMention[]
}

export type ComposerWritebackMode = "refuse" | "merge"

export type ComposerWritebackOptions = {
  mode: ComposerWritebackMode
  /** 写完把光标放到末尾，默认 true。 */
  focus?: boolean
  /** 只在前台还是这个会话时写；换了会话返回 session-changed。不给就不查。 */
  expectSessionId?: string | null
}

export type ComposerWritebackResult =
  | { ok: true; merged: boolean; text: string }
  | { ok: false; reason: ComposerWritebackRefusal; current: string }

export type ComposerWritebackRefusal = "composer-has-content" | "composing" | "session-changed" | "writeback-held"

/** 写不了的原因；能写返回 null。顺序：换了会话 → 组字中 → 回写锁 → refuse 且输入框有东西。 */
function writebackRefusal(
  mode: ComposerWritebackMode,
  expectSessionId: string | null | undefined
): ComposerWritebackRefusal | null {
  if (expectSessionId !== undefined && useChatStore.getState().sessionId !== expectSessionId) return "session-changed"
  if (isComposerComposing()) return "composing"
  if (isComposerWritebackHeld() || isNewSessionCreatePending()) return "writeback-held"
  if (mode === "refuse" && composerHasLiveContent()) return "composer-has-content"
  return null
}

/** 输入框当下的正文：DOM 优先（回写锁期间 store 落后）。 */
export function liveComposerText(): string {
  return readComposerDomText()
}

/** 输入框里有没有用户的东西（正文非空白、附件、任何 Chip）。 */
export function composerHasLiveContent(): boolean {
  return liveComposerText().trim().length > 0 || composerHasExtras()
}

/** 按 mode 现在能不能写（不写任何东西）。refuse 场景先问它，再从队列 / 存档里把源数据取出来。 */
export function canWriteBackToComposer(
  mode: ComposerWritebackMode,
  opts: { expectSessionId?: string | null } = {}
): boolean {
  return writebackRefusal(mode, opts.expectSessionId) === null
}

export function writeBackToComposer(
  content: ComposerWritebackContent,
  opts: ComposerWritebackOptions
): ComposerWritebackResult {
  const current = liveComposerText()
  const refusal = writebackRefusal(opts.mode, opts.expectSessionId)
  if (refusal) return { ok: false, reason: refusal, current }
  const dirty = composerHasLiveContent()
  const text = dirty ? mergeWritebackText(content.text, current) : content.text
  const store = useChatStore.getState()
  store.setComposer(text)
  syncComposerDom(text, true)
  if (content.assets?.length) {
    // 逐张 queueComposerAsset：和用户自己贴图一样落草稿存档（重启不丢）；已在输入框里的同 id 图跳过。
    const have = new Set(listComposerAssets().map((a) => a.id))
    for (const asset of uniqueBy(content.assets, (a) => a.id)) if (!have.has(asset.id)) queueComposerAsset(asset)
  }
  if (content.quotedContexts?.length) {
    setQuotedContexts(uniqueBy([...listQuotedContexts(), ...content.quotedContexts], (q) => JSON.stringify(q)))
  }
  if (content.skillChips?.length) {
    setComposerSkillChips(uniqueBy([...listComposerSkillChips(), ...content.skillChips], (s) => JSON.stringify(s)))
  }
  if (opts.focus !== false) focusComposerEnd()
  return { ok: true, merged: dirty, text }
}

/**
 * merge 模式的正文合并（#159 F1，mike 与 kai 约定由这里管分隔与去重）：
 * - 输入框没字 → 写回的；写回的没字 → 输入框原样。
 * - 输入框里已经有写回的这一整段（按行比，逐行去首尾空白、忽略空行，必须连续相同）→ 不追加。
 * - 写回的这一段已经包含输入框里的全部行 → 用写回的（不把同一句叠两遍）。
 * - 子串不算重复：输入框「category」不会吞掉写回的「cat」。
 * - 否则现有在前，现有末尾的空白收掉后用**一个**换行接上写回的（写回的开头空行也收掉）。
 */
export function mergeWritebackText(incoming: string, current: string): string {
  if (!current.trim()) return incoming
  if (!incoming.trim()) return current
  const have = meaningfulLines(current)
  const back = meaningfulLines(incoming)
  if (containsBlock(have, back)) return current
  if (containsBlock(back, have)) return incoming
  return `${current.replace(/\s+$/, "")}\n${incoming.replace(/^(?:[ \t]*\n)+/, "")}`
}

/** current 里有没有 incoming 这一整段（按行比，逐行去首尾空白、忽略空行，连续相同）。空的 incoming 算有。 */
export function textContainsBlock(current: string, incoming: string): boolean {
  const back = meaningfulLines(incoming)
  if (back.length === 0) return true
  return containsBlock(meaningfulLines(current), back)
}

function meaningfulLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/** hay 里有没有一段连续的行与 needle 完全相同。 */
function containsBlock(hay: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false
  for (let start = 0; start + needle.length <= hay.length; start += 1) {
    let same = true
    for (let i = 0; i < needle.length; i += 1) {
      if (hay[start + i] !== needle[i]) {
        same = false
        break
      }
    }
    if (same) return true
  }
  return false
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}
