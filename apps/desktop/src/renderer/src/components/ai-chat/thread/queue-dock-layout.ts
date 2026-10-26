/**
 * 紧凑排队区（输入框 / 审批卡正上方）的纯判定，放在 .ts 里让 node --test 直接测（mike P3 #163 巡检）。
 * - rowsHiddenBelow：点开后区内滚，排队行被裁在区底下几条（给「还有 N 条」提示用）。
 * - refoldOnShort：点开过，窗口再被拉到 ≤600 高 → 重新折成「已暂停 · 排队 N 条」（m211-33）。
 * - keepThreadForFailureCard：停着且对话里挂着失败卡（「再发一次」那张）→ 对话区保底一截高度，按钮整颗露出。
 * - showHiddenBelowPill：「还有 N 条」画不画——只在能单独占一行画在滚动区下面时画，放不下就不画（永不盖行）。
 * - foldOnSqueeze：点开着的排队区从够高被挤到 <64px（底下还藏着行）的那一刻，折回一行（luna #170 r-luna ①）。
 */
import { PREVIOUS_STILL_PREPARING } from "../../../lib/usage/classify-thread-error.ts"

/** 底边超出可视区底边多少 px 才算「被裁」：1px 以内是取整误差。 */
const HIDDEN_EPSILON_PX = 1

/**
 * 区内滚时，可视区底边以下还藏着几条排队行。
 * rowBottoms：每条排队行底边的 y（和 viewportBottom 同一坐标系，通常是 getBoundingClientRect）。
 * 被裁掉一半的那条也算（看不全就点不准）。
 */
export function rowsHiddenBelow(rowBottoms: readonly number[], viewportBottom: number): number {
  let hidden = 0
  for (const bottom of rowBottoms) {
    if (bottom - viewportBottom > HIDDEN_EPSILON_PX) hidden += 1
  }
  return hidden
}

/** 窗口从高变矮（跨过 600 线）的那一刻收起；本来就矮时用户点开不受影响。 */
export function refoldOnShort(wasShort: boolean, isShort: boolean): boolean {
  return !wasShort && isShort
}

/**
 * 停着的排队区和对话末尾的失败卡同时在：对话区不能被排队区挤成 0（733×480「再发一次」只露半颗）。
 * 输入框帽檐里的「上一条还在准备」灰条（isComposerRailNotice）不在对话区，不算。
 */
export function keepThreadForFailureCard(queuePaused: boolean, error: string | null | undefined): boolean {
  return queuePaused && Boolean(error) && error !== PREVIOUS_STILL_PREPARING
}

/**
 * 「还有 N 条」单独一行画在滚动区下面需要的排队区高度（px）：上下 padding 8 + 一行排队 28 + 间距 4 + 小胶囊 24。
 * 够高 → 画在下面，永远不盖行（leo #170 soft-5）。不够（审批卡 + 733×480 把排队区挤到一行高）→ 不画（luna #170 01d）：
 * 以前退回贴在区底左下角会盖住那一行左边的正文；这时候再占一行就一条排队行都露不出来，宁可不提示也不盖字。
 * 区内仍可滚（滚轮 / 触控板），审批处理完排队区长回来，胶囊自己回来。
 * 按排队区外层高度判：胶囊出现 / 消失不改外层高度（max-h / min-h 由排队区自己定），不会来回跳。
 */
export const PILL_BELOW_MIN_DOCK_PX = 64

export function pillFitsBelow(dockHeight: number): boolean {
  return dockHeight >= PILL_BELOW_MIN_DOCK_PX
}

/** 画不画「还有 N 条」：底下真有藏着的行，且排队区够高能把它单独放一行；否则不画（不贴区底、不盖行）。 */
export function showHiddenBelowPill(hiddenBelow: number, dockHeight: number): boolean {
  return hiddenBelow > 0 && pillFitsBelow(dockHeight)
}

/**
 * luna #170 r-luna ①：点开着的排队区被挤到 <64px（审批卡 + 733×480 时只剩约 36px，「还有 N 条」放不下、行被裁）
 * → 折回一行（「已暂停 · 排队 N 条」/「排队 N 条」，复用现成的折叠行），和 refoldOnShort 一个规矩：
 * 只在「这次点开后够高过（≥64px，seenRoomy），现在被挤到不够」时折；
 * 本来就挤时用户自己点开不受影响（不然点开就被立刻收回，审批时排队行上的「马上发给它」永远点不到）。
 * 底下没藏行（全露着）不折。折了之后空间回来也不自己展开，只有用户点。
 * 用「够高过」而不是「上一次的高度」：高度和藏行数是两个观察者分别量的，先后到达时不会漏掉这一次。
 * 一轮只自动折一次（luna #170 r-luna ① 补充）：自动折过（autoFolded）之后用户再点开，就是要看——之后再被挤也不再折，
 * 直到这一轮结束。排队区点开后没有「收起」按钮（用户没法自己收），所以「一轮结束」按别的原因收起 / 换了上下文算：
 * 换了一张审批卡 / 暂停原因变了（排队区本来就回到默认收起）、窗口从高变矮跨过 600 线被 refoldOnShort 收起、
 * 切会话、排队清空（排队区整块卸掉，状态跟着没了）。用户点开不清——那正是「自动折过之后又点开」。
 */
export function foldOnSqueeze(seenRoomy: boolean, dockHeight: number, hiddenBelow: number, autoFolded: boolean): boolean {
  return !autoFolded && seenRoomy && hiddenBelow > 0 && !pillFitsBelow(dockHeight)
}

