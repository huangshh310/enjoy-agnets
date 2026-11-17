/**
 * 审批裁切（733 托盘展开审批可点，B′）：#224 slot、#228 K12 squeeze 之外的第三路单行条进入条件。
 * 只吃 DOM 实测，不读审批状态、不写死任何视口 / 地板值：
 * - 进入：审批 footer 的 bottom 越过对话外壳（chat-conversation 的 parentElement，裁切线）bottom 超过亚像素 → 转条；
 *   必须量外壳不量列（列被审批地板撑过外壳时，列底比裁切线低，量列会少算）。
 * - 释放：footer 消失 → 立即放；否则只按「外壳高 − 列地板 ≥ 整簇长回量 + 8」放（R1）。
 *   不拿「裁切线 − footer 底」当余量：不被裁时它恒为卡片 / dock 底内边距，量不到真实余地。
 *   地板 = 浏览器算好的 computed min-height px（由 hook 复用同一次读数传入），这里不复算 CSS 表达式。
 * - 长回量（R2）= 进入时 Composer 外壳高 − 转条后外壳高。转条后首帧开始量，之后只增不减（冻结下限）：
 *   表单收回余量带 CSS 过渡，首帧外壳只降了一部分（真机 733×480：首帧 59，过渡完 67），只取首帧会少估、提前释放；
 *   表单之后长高（多行输入）则外壳变高、算出的值变小，只增不减保证不因此提前释放。附件数变化则作废（未知）。
 * - 内容需求兜底（R1 补）：列里排队坞（行模式）+ 审批卡压到最小后的需求可能大于地板（真机 733 q2：宽屏回来坞是两行，
 *   只比地板时释放后外壳 105、footer 仍越线 26，被裁回、已绘制一帧 0/5）。hook 每帧实测
 *   contentNeedPx = footer 底 − 列顶 − 消息区可让出的高 − 审批卡可让出的高（各自 rect 高 − computed min-height），
 *   释放要求「外壳高 − 长回量」同时 ≥ 地板 + 8 与 ≥ 内容需求 + 8：只会更晚放、不会更早；量不到时只按地板。
 * - 保守兜底（R3）：地板不是有限数或长回量未知 → 不按几何放，只等 footer 消失。
 * - 防抖闩（R4，仿 K6 blockedBelowPx）：几何释放后又被裁回来 → 重进并把闩设在重进后条带首帧的外壳高；
 *   外壳再长 ≥ 8 才允许再次几何释放。footer 消失时清闩。
 */
import { TRAY_SQUEEZE_RELEASE_PX } from "./composer-tray-squeeze.ts"

export const APPROVAL_CLIP_SUBPIXEL_PX = 0.5
export const APPROVAL_CLIP_RELEASE_PX = 8

export type TrayApprovalClip = {
  on: boolean
  /** 进入时（转条前）Composer 外壳高。 */
  entryClusterPx: number | null
  /** 整簇长回量（转条后只增不减）；null = 还没量（等转条后首帧）。 */
  regrowPx: number | null
  /** 长回量作废（附件数变了），只等 footer 消失。 */
  regrowUnknown: boolean
  /** 进入时的附件数（长回量失效键）。 */
  attachCount: number | null
  /** 上一次 off 是几何释放（不是 footer 消失）：下次重进要上闩。 */
  releasedByGeometry: boolean
  /** 重进后待在条带首帧记闩。 */
  latchPending: boolean
  /** R4 闩：条带态外壳高须 ≥ 它 + 8 才允许几何释放。 */
  blockedBelowPx: number | null
}

export const TRAY_APPROVAL_CLIP_OFF: TrayApprovalClip = {
  on: false,
  entryClusterPx: null,
  regrowPx: null,
  regrowUnknown: false,
  attachCount: null,
  releasedByGeometry: false,
  latchPending: false,
  blockedBelowPx: null
}

export type TrayApprovalClipInput = {
  /** 审批 footer 的 rect.bottom；没有审批卡 / footer 不可见 → null。 */
  footerBottom: number | null
  /** 裁切外壳 rect.bottom。 */
  clipBottom: number | null
  /** 裁切外壳 rect.height。 */
  clipH: number | null
  /** 对话列 computed min-height 解析出的 px（可能 NaN）。 */
  floorPx: number | null
  /** 列内容压到最小后到 footer 底的需求（hook 实测）；量不到 → null（只按地板）。 */
  contentNeedPx?: number | null
  /** Composer 外壳（表单父级）rect.height。 */
  clusterPx: number | null
  /** 当前附件数。 */
  attachCount: number
  /** 上一帧已经按单行条渲染（budget.strip 已提交）。 */
  stripApplied: boolean
  /** 条带已由别的路（#224 slot / K12 squeeze）画着：此时 footer 越线转条也帮不上，且量不到转条前簇高 → 不进入。 */
  stripHeldElsewhere?: boolean
}

function finite(n: number | null): n is number {
  return n != null && Number.isFinite(n)
}

export function nextTrayApprovalClip(prev: TrayApprovalClip, m: TrayApprovalClipInput): TrayApprovalClip {
  // footer 消失（批准 / 拒绝 / 停止）或量不到裁切外壳：立即释放并清闩。
  if (!finite(m.footerBottom) || !finite(m.clipBottom)) {
    return prev === TRAY_APPROVAL_CLIP_OFF ? prev : TRAY_APPROVAL_CLIP_OFF
  }
  if (!prev.on) {
    if (m.stripHeldElsewhere) return prev
    const clipPx = m.footerBottom - m.clipBottom
    if (!(clipPx > APPROVAL_CLIP_SUBPIXEL_PX)) return prev
    return {
      on: true,
      entryClusterPx: finite(m.clusterPx) ? m.clusterPx : null,
      regrowPx: null,
      regrowUnknown: !finite(m.clusterPx),
      attachCount: m.attachCount,
      releasedByGeometry: false,
      latchPending: prev.releasedByGeometry,
      blockedBelowPx: prev.blockedBelowPx
    }
  }

  let next = prev
  // R2：附件数变 → 长回量作废。
  if (prev.attachCount !== m.attachCount && !prev.regrowUnknown) {
    next = { ...next, regrowUnknown: true, regrowPx: null }
  }
  // 转条后首帧：冻结长回量；重进后首帧记闩（同一帧外壳高）。
  if (m.stripApplied) {
    if (!next.regrowUnknown && next.entryClusterPx != null && finite(m.clusterPx)) {
      const regrow = Math.max(0, next.entryClusterPx - m.clusterPx)
      if (next.regrowPx == null || regrow > next.regrowPx) next = { ...next, regrowPx: regrow }
    }
    if (next.latchPending && finite(m.clipH)) {
      next = { ...next, latchPending: false, blockedBelowPx: m.clipH }
    }
  }

  // R3：地板 / 长回量不可用 → 只等 footer 消失。
  if (!finite(m.floorPx) || !finite(m.clipH) || next.regrowUnknown || next.regrowPx == null || next.latchPending) return next
  // R4：闩住时外壳须再长 ≥ 8。
  if (next.blockedBelowPx != null && m.clipH < next.blockedBelowPx + APPROVAL_CLIP_RELEASE_PX) return next
  // R1：外壳高 − max(地板, 内容需求) ≥ 长回量 + 8。
  const need = finite(m.contentNeedPx ?? null) ? Math.max(m.floorPx, m.contentNeedPx as number) : m.floorPx
  if (m.clipH - need >= next.regrowPx + APPROVAL_CLIP_RELEASE_PX) {
    return { ...TRAY_APPROVAL_CLIP_OFF, releasedByGeometry: true, blockedBelowPx: next.blockedBelowPx }
  }
  return next
}

/**
 * 三路 OR：#224 slot → 否则 K12 squeeze 或审批裁切。
 * 446 P1-c：有验收框时 K12 不再清零，slot 分支 = slotStrip ‖ squeezed（slot ≥ 108 但外壳仍放不下时由 K12 接住，
 * 733×510–558 批准后 send/stop 511 / stop 0/5）；审批裁切仍只在没有验收框时判。
 */
export function trayStripFromPaths(args: { slotStrip: boolean; slot: number | null; squeezed: boolean; approvalClip: boolean }): boolean {
  if (args.slot != null) return args.slotStrip || args.squeezed
  return args.squeezed || args.approvalClip
}

/**
 * 审批消失时的 K12 交接（jojo §11 释放 ≤3 帧、§9 释放不盖可点项）：审批走掉后 Composer 外壳从 shrink-0 变回可让位，
 * 「此后是否挤压由现有 K12 squeeze 决定」。K12 自己要等托盘长回（CSS 过渡）、内容溢出、RO 再晚一帧才进，
 * 中间会画出 send 掉到状态栏下的帧（真机 zh / en q0：2 帧 453 > 430，条 → 108 → 条）。
 * 这里在释放的同一帧把条带交给 K12：needPx = 条带内容高 + 长回量（= 整托盘内容高，即 K12 进入时会量到的值），
 * 再按 K12 原式（盒高 + 对话区高出保底的部分 ≥ needPx + 8）判一次——放得下就立即放（1024 / 1440 不变），放不下以 K12 态接手。
 * 长回量未知（附件数变作废）→ 不交接，交回 K12 自己判。不改 composer-tray-squeeze 的常量与公式。
 */
export function squeezeHandoverOnRelease(args: {
  regrowPx: number | null
  contentPx: number
  boxPx: number
  conversationSlackPx: number
}): { on: true; needPx: number } | null {
  if (args.regrowPx == null || !Number.isFinite(args.regrowPx)) return null
  const needPx = args.contentPx + args.regrowPx
  const room = args.boxPx + Math.max(0, args.conversationSlackPx)
  return room >= needPx + TRAY_SQUEEZE_RELEASE_PX ? null : { on: true, needPx }
}

/**
 * 交接后 K12 态内：审批走后 Composer 里可能晚一两帧多出一行（真机条带内容 197 → 233），整托盘内容随之变高；
 * needPx 只增不减地跟上「条带内容高 + 长回量」，免得按偏小的 needPx 提前放、放了又被 K12 挤回（条 ⇄ 108）。
 */
export function refreshHandoverNeed(needPx: number | null, contentPx: number, regrowPx: number): number {
  const full = contentPx + regrowPx
  return needPx == null || full > needPx ? full : needPx
}
