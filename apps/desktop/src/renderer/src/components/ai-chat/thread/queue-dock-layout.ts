/**
 * 紧凑排队区（输入框 / 审批卡正上方）的纯判定，放在 .ts 里让 node --test 直接测（mike P3 #163 巡检）。
 * - rowsHiddenBelow：点开后区内滚，排队行被裁在区底下几条（给「还有 N 条」提示用）。
 * - refoldOnShort：点开过，窗口再被拉到 ≤600 高 → 重新折成「已暂停 · 排队 N 条」（m211-33）。
 * - keepThreadForFailureCard：停着且对话里挂着失败卡（「再发一次」那张）→ 对话区保底一截高度，按钮整颗露出。
 * - pillFitsBelow：「还有 N 条」能不能单独占一行画在滚动区下面（不盖任何一行）。
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
 * 够高 → 画在下面，永远不盖行（leo #170 soft-5）；不够（审批卡 + 733×480 把排队区挤到一行高）→ 退回贴在区底左下角，
 * 只盖那一行左边的正文、不盖右侧按钮——这时候再占一行就一条排队行都露不出来了。
 * 按排队区外层高度判：胶囊挪上挪下不改外层高度，不会来回跳。
 */
export const PILL_BELOW_MIN_DOCK_PX = 64

export function pillFitsBelow(dockHeight: number): boolean {
  return dockHeight >= PILL_BELOW_MIN_DOCK_PX
}
