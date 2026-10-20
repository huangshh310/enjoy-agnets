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
 * - mode "merge"：正文按 mergeComposerText(写回的, 输入框现有的) 合并（现有在前，包含关系去重）；
 *   附件按 id、Chip 按内容去重后追加（附件走 queueComposerAsset，和手贴一样落草稿存档）。只在正在组字时拒绝（不打断输入法）。
 * - 写入：store.setComposer + 强制同步 DOM（读的就是 DOM，强写不会丢字）；不动回写锁；focus 默认 true（光标放末尾）。
 * - 纯同步函数，无 IPC；不碰排队队列 / 草稿持久化，调用方自己决定先查后取（refuse 时用 canWriteBackToComposer 先问）。
 */
import { useChatStore } from "../stores/chat-store"
import { mergeComposerText } from "../lib/merge-composer-text"
import { readComposerDomText, syncComposerDom } from "./composer-dom"
import { isComposerComposing } from "./composer-ime"
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
}

export type ComposerWritebackResult =
  | { ok: true; merged: boolean; text: string }
  | { ok: false; reason: "composer-has-content" | "composing"; current: string }

/** 输入框当下的正文：DOM 优先（回写锁期间 store 落后）。 */
export function liveComposerText(): string {
  return readComposerDomText()
}

/** 输入框里有没有用户的东西（正文非空白、附件、任何 Chip）。 */
export function composerHasLiveContent(): boolean {
  return liveComposerText().trim().length > 0 || composerHasExtras()
}

/** 按 mode 现在能不能写（不写任何东西）。refuse 场景先问它，再从队列 / 存档里把源数据取出来。 */
export function canWriteBackToComposer(mode: ComposerWritebackMode): boolean {
  if (isComposerComposing()) return false
  return mode === "merge" || !composerHasLiveContent()
}

export function writeBackToComposer(
  content: ComposerWritebackContent,
  opts: ComposerWritebackOptions
): ComposerWritebackResult {
  const current = liveComposerText()
  if (isComposerComposing()) return { ok: false, reason: "composing", current }
  const dirty = composerHasLiveContent()
  if (dirty && opts.mode === "refuse") return { ok: false, reason: "composer-has-content", current }
  const text = dirty ? mergeComposerText(content.text, current) : content.text
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
