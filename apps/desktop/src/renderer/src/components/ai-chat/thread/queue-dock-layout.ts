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


/**
 * K6（luna §15）：暂停排队区点开后被挤（区内容高 > 可视高）时的「挤压态」——只看排队区自己的实测，不看窗宽、不看语言。
 * 挤压态里：区上下 padding py-1 → py-0.5（共 4），说明行钉在顶上（sticky，压到 24），排队行在它下面按整行吸附滚动；
 * 可见高度取整行 n×30 + (n−1)×4，n = floor((可用 + 4) / 34)，零头还给对话区。任何滚动位置都不露半行。
 * n < 1：不进挤压态，照现网（foldOnSqueeze 等判定都不动）。
 * 释放：可用高度回到进入时量的「正常排法需要的高度」+ 8px 回滞，和底栏判级同一套规矩。
 * 「还有 N 条」照 pillFitsBelow：挤压态高度 ≥ 64 且底下还有行时它会画在滚动区下面，所以这时先给它留出一行再算 n。
 */
export const DOCK_ROW_PX = 30
export const DOCK_ROW_GAP_PX = 4
export const DOCK_SQUEEZED_PAD_PX = 4
export const DOCK_SQUEEZED_DESC_PX = 24
export const DOCK_NORMAL_PAD_PX = 8
export const DOCK_SQUEEZE_RELEASE_PX = 8
/** 「还有 N 条」单独一行：mt-1 + min-h-6。 */
export const DOCK_PILL_ROW_PX = 28
/** 点开时排队区 max-h-[9.5rem]。 */
export const DOCK_EXPANDED_MAX_PX = 152

export type DockSqueeze = {
  squeezed: boolean
  /** 进入时量的正常排法需要的区高（内容 + py-1）；释放看它 + 8。 */
  needPx: number | null
  rows: number
  heightPx: number
  /** 挤压态算出 n < 1 被迫退出时记下可用高：回滞 8px 之前不再进，免得来回抖。 */
  blockedBelowPx: number | null
}

export const DOCK_SQUEEZE_OFF: DockSqueeze = { squeezed: false, needPx: null, rows: 0, heightPx: 0, blockedBelowPx: null }

/** 挤压态 n 行时整个排队区的高度（padding + 说明行 + 间距 + n 行 + 行间距）。 */
export function squeezedDockHeight(rows: number, descPx = DOCK_SQUEEZED_DESC_PX): number {
  return DOCK_SQUEEZED_PAD_PX + descPx + DOCK_ROW_GAP_PX + rows * DOCK_ROW_PX + Math.max(0, rows - 1) * DOCK_ROW_GAP_PX
}

/** 可用区高里放得下几整行排队行：n = floor((行区可用 + 4) / 34)。 */
export function squeezedRowsFor(availPx: number, descPx = DOCK_SQUEEZED_DESC_PX): number {
  const rowsAvail = availPx - DOCK_SQUEEZED_PAD_PX - descPx - DOCK_ROW_GAP_PX
  return Math.floor((rowsAvail + DOCK_ROW_GAP_PX + 0.5) / (DOCK_ROW_PX + DOCK_ROW_GAP_PX))
}

/** 给定可用高 / 条数，挤压态取几行、区多高（含「还有 N 条」那一行，若它会画）；放不下一整行返回 null。 */
export function squeezedLayout(availPx: number, count: number, descPx = DOCK_SQUEEZED_DESC_PX): { rows: number; heightPx: number } | null {
  const avail = Math.min(availPx, DOCK_EXPANDED_MAX_PX)
  const n = squeezedRowsFor(avail, descPx)
  if (n < 1 || count < 1) return null
  if (n >= count) return { rows: count, heightPx: squeezedDockHeight(count, descPx) }
  if (!pillFitsBelow(squeezedDockHeight(n, descPx))) return { rows: n, heightPx: squeezedDockHeight(n, descPx) }
  // 底下还有行、区又 ≥ 64：现网会把「还有 N 条」画在滚动区下面（pillFitsBelow），先给它留一行。
  const withPill = squeezedRowsFor(avail - DOCK_PILL_ROW_PX, descPx)
  if (withPill >= 1) return { rows: withPill, heightPx: squeezedDockHeight(withPill, descPx) + DOCK_PILL_ROW_PX }
  // 留了胶囊就一行都放不下：退到 1 行不带胶囊（1 行区高 < 64，胶囊本来就不画）。
  const one = squeezedDockHeight(1, descPx)
  return pillFitsBelow(one) ? null : { rows: 1, heightPx: one }
}

/**
 * 挤压态下一帧：只吃排队区自己的实测。
 * - contentPx / visiblePx：滚动区的 scrollHeight / clientHeight（不在挤压态时就是正常排法）；
 * - availPx：排队区现在的高 + 对话区比它的 min-height 多出来的那截（零头还回去之后还能要回来）；
 * - descPx：挤压态里说明行实测高（窄到按钮折行时会比 24 高），不在挤压态时按 24 算。
 */
export function nextDockSqueeze(
  prev: DockSqueeze,
  m: { open: boolean; contentPx: number; visiblePx: number; availPx: number; descPx: number; count: number }
): DockSqueeze {
  if (!m.open) return DOCK_SQUEEZE_OFF
  if (!prev.squeezed) {
    if (prev.blockedBelowPx != null && m.availPx < prev.blockedBelowPx + DOCK_SQUEEZE_RELEASE_PX) return prev
    if (m.contentPx <= m.visiblePx + 0.5) return prev.blockedBelowPx == null ? prev : DOCK_SQUEEZE_OFF
    const layout = squeezedLayout(m.availPx, m.count)
    if (!layout) return prev
    return { squeezed: true, needPx: m.contentPx + DOCK_NORMAL_PAD_PX, rows: layout.rows, heightPx: layout.heightPx, blockedBelowPx: null }
  }
  if (prev.needPx != null && m.availPx >= prev.needPx + DOCK_SQUEEZE_RELEASE_PX) return DOCK_SQUEEZE_OFF
  const layout = squeezedLayout(m.availPx, m.count, Math.max(DOCK_SQUEEZED_DESC_PX, m.descPx))
  if (!layout) return { ...DOCK_SQUEEZE_OFF, blockedBelowPx: m.availPx }
  if (layout.rows === prev.rows && layout.heightPx === prev.heightPx) return prev
  return { ...prev, rows: layout.rows, heightPx: layout.heightPx }
}
