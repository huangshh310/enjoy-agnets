/**
 * 托盘预算一次 measure 的纯编排（leo M3 / C11）：hook 只读 DOM、setState，这里按固定顺序调用既有纯函数，
 * 不碰 document / getComputedStyle，不改被调函数本体（trayStripSlot、shouldUseTrayStrip、nextTraySqueeze、
 * nextTrayApprovalClip、trayStripFromPaths、squeezeHandoverOnRelease、refreshHandoverNeed）。
 *
 * 446 刀（733 批准后 send/stop 446/511 + slot 释放 1 帧 108）：
 * - P1-c：slot 期 K12 照常判（不清零），slot 分支条带 = slotStrip ‖ squeezed（trayStripFromPaths）。
 * - P1-b：slot 非 null → null 且条带已画：K12 开 → 原式判；K12 关 → 用统一长回量（nextStripRegrow）走
 *   squeezeHandoverOnRelease 同帧接手；长回量未知 → fallback（交 K12 自判）。
 * - C12：K12 开、条带已画、长回量已知 → needPx 只增不减地跟上「条带内容 + 长回量」。
 * - P1-a：条带已画仍越线 → 帽檐「下一句」行（同 rail 的「已收到…」/ 图片退回，§17）让位；
 *   放回 = 对话区 − min ≥ rowPx + 8 且不越线（C2′ / luna R4）；R4 闩键 = size 容器高（leo Q-6）。
 * 顺序（C11）：slot → K12 → 审批裁切 → slot 释放交接 → 条带 → 长回量 → 让位，同一次提交。
 */
import { listFollowups, followupPausedReason, visibleRuntimeHint } from "@renderer/hooks/followup-queue"
import { runtimeHintPlacement } from "./runtime-interact/runtime-hint-placement.ts"
import {
  sendBottomBudget,
  shouldUseTrayStrip,
  statusBarBottomEdge,
  trayStripSlot,
  type TraySlotInput
} from "./composer-tray-leftover.ts"
import { nextTraySqueeze, TRAY_SQUEEZE_OFF, type TraySqueeze } from "./composer-tray-squeeze.ts"
import {
  nextTrayApprovalClip,
  refreshHandoverNeed,
  squeezeHandoverOnRelease,
  TRAY_APPROVAL_CLIP_OFF,
  trayStripFromPaths,
  type TrayApprovalClip
} from "./composer-tray-approval-clip.ts"

/** 让位 / 放回的亚像素容差与回滞（同 K6 / K12 / 审批裁切）。 */
export const CLUSTER_YIELD_SUBPIXEL_PX = 0.5
export const CLUSTER_YIELD_RELEASE_PX = 8

/**
 * rail 显示判定的单一事实来源（leo M1）：rail 自己与托盘预算 hook 都只调这一个只读谓词。
 * = visibleRuntimeHint → 没有提示不画 → runtimeHintPlacement(…) === "frame"。不写 store、不改 placement。
 */
export function followupRailWouldRender(sessionId: string | null, approvalPending: boolean): boolean {
  const hint = visibleRuntimeHint(sessionId)
  if (!hint) return false
  const paused = followupPausedReason(sessionId) != null
  return runtimeHintPlacement(hint, approvalPending, listFollowups(sessionId).length, paused) === "frame"
}

/**
 * 让位让出的高度（luna R1 / leo M8）：rail 是帽檐框唯一可见子项 → 整框收起，让出 = 框 rect 高 + computed mb；
 * 否则只收子行，让出 = rail rect 高（主路径 29）。全是读数，不写死。
 */
export function hintRowPx(m: { railPx: number; framePx: number; frameMarginBottomPx: number; sole: boolean }): number {
  if (!m.sole) return m.railPx
  const mb = Number.isFinite(m.frameMarginBottomPx) ? m.frameMarginBottomPx : 0
  return m.framePx + mb
}

/** R4 闩键取数用的最小节点形状（DOM Element 满足；单测用假节点）。 */
export type LatchNode = { parentElement: LatchNode | null; getBoundingClientRect(): { height: number } }

/**
 * R4 闩键（leo Q-6 / M7）：对话列 → 对话外壳 → size 容器（chat-stage）的高，只随窗口 / 标题栏 / 状态栏变，
 * 不随让位、条带、slot、审批变。不取对话外壳（它随让位 +rowPx，闩会被自身往返解开）。
 */
export function clusterYieldLatchBoxPx(conversation: LatchNode | null): number | null {
  const sizeBox = conversation?.parentElement?.parentElement ?? null
  return sizeBox ? sizeBox.getBoundingClientRect().height : null
}

/** G1（leo M4′）：输出不变不 setState；翻转（clip / strip / hintYield）且调用方允许 sync 时 flushSync。 */
export function sameTrayBudget(a: TrayBudgetDecision, b: TrayBudgetDecision): boolean {
  return (
    a.strip === b.strip && a.reclaimSlack === b.reclaimSlack && a.slot === b.slot && a.squeezed === b.squeezed &&
    a.approvalClip === b.approvalClip && a.hintYield === b.hintYield && a.residualPx === b.residualPx &&
    a.hintPresent === b.hintPresent && a.handover === b.handover
  )
}

export type TrayBudgetCommit = "none" | "set" | "flush"

export function trayBudgetCommit(prev: TrayBudgetDecision, next: TrayBudgetDecision, sync: boolean): TrayBudgetCommit {
  if (sameTrayBudget(prev, next)) return "none"
  const flipped = next.approvalClip !== prev.approvalClip || next.strip !== prev.strip || next.hintYield !== prev.hintYield
  return sync && flipped ? "flush" : "set"
}

/** G2（leo M4′）：T2 每帧（rAF 复位）最多重测次数（T1 已按 V1 删掉）；超出留给下一次 RO。 */
export const TRAY_REMEASURE_PER_FRAME = 2

export function admitTrayRemeasure(countThisFrame: number): { admit: boolean; count: number } {
  if (countThisFrame >= TRAY_REMEASURE_PER_FRAME) return { admit: false, count: countThisFrame }
  return { admit: true, count: countThisFrame + 1 }
}

export type ClusterYield = {
  on: boolean
  /** 让出的高度（进入时量，一次让位周期内冻结）。 */
  rowPx: number | null
  /** 上一次 off 是几何放回：下次重进要上闩。 */
  releasedByGeometry: boolean
  /** R4 闩：size 容器高须 ≥ 它 + 8 才允许再次几何放回。 */
  blockedBelowPx: number | null
  /** 闩的失效键。 */
  attachCount: number | null
}

export const CLUSTER_YIELD_OFF: ClusterYield = {
  on: false,
  rowPx: null,
  releasedByGeometry: false,
  blockedBelowPx: null,
  attachCount: null
}

export type ClusterYieldInput = {
  /** rail 本来要画（followupRailWouldRender）。 */
  hintPresent: boolean
  /** rail 当前渲染着时的让出量（hintRowPx）；让位中 / 没画 → null。 */
  hintRowPx: number | null
  prevStrip: boolean
  nextStrip: boolean
  /** max(send, stop) bottom − sendBottomBudget；量不到 → null。 */
  overflowPx: number | null
  /** 对话区 rect 高 − computed min-height；地板不是有限数 → null。 */
  slackPx: number | null
  /** R4 闩键（clusterYieldLatchBoxPx）。 */
  boxPx: number | null
  attachCount: number
}

export function nextClusterYield(prev: ClusterYield, m: ClusterYieldInput): ClusterYield {
  // 提示没了（跑完 / 关掉 / 审批出现改画到 dock）→ 立即放回并清闩。
  if (!m.hintPresent) return prev === CLUSTER_YIELD_OFF ? prev : CLUSTER_YIELD_OFF
  // 附件数变：闩作废。
  let base = prev
  if (prev.attachCount != null && prev.attachCount !== m.attachCount) {
    base = { ...prev, blockedBelowPx: null, releasedByGeometry: false, attachCount: m.attachCount }
  }
  if (!base.on) {
    if (m.hintRowPx == null || !(m.hintRowPx > 0)) return base
    if (!(m.prevStrip && m.nextStrip)) return base
    if (m.overflowPx == null || !(m.overflowPx > CLUSTER_YIELD_SUBPIXEL_PX)) return base
    return {
      on: true,
      rowPx: m.hintRowPx,
      releasedByGeometry: false,
      blockedBelowPx: base.releasedByGeometry && m.boxPx != null ? m.boxPx : base.blockedBelowPx,
      attachCount: m.attachCount
    }
  }
  // 本帧条带翻转：不放回，下一次 measure 再判（C11）。
  if (m.prevStrip !== m.nextStrip) return base
  // R3 同款：地板不可用 → 只等提示消失。
  if (m.slackPx == null || base.rowPx == null) return base
  if (base.blockedBelowPx != null && (m.boxPx == null || m.boxPx < base.blockedBelowPx + CLUSTER_YIELD_RELEASE_PX)) return base
  if (m.slackPx >= base.rowPx + CLUSTER_YIELD_RELEASE_PX && (m.overflowPx == null || m.overflowPx <= CLUSTER_YIELD_SUBPIXEL_PX)) {
    return { ...CLUSTER_YIELD_OFF, releasedByGeometry: true, blockedBelowPx: base.blockedBelowPx, attachCount: base.attachCount }
  }
  return base
}

/** 统一条带长回量（复用 #230 R2 测法，不分哪一路进的条）：进入时外壳高 − 条带态外壳高，只增不减。 */
export type StripRegrow = { entryShellPx: number | null; regrowPx: number | null; unknown: boolean; attachCount: number | null }
export const STRIP_REGROW_OFF: StripRegrow = { entryShellPx: null, regrowPx: null, unknown: false, attachCount: null }

export function nextStripRegrow(
  prev: StripRegrow,
  m: { prevStrip: boolean; nextStrip: boolean; shellPx: number | null; attachCount: number }
): StripRegrow {
  if (!m.nextStrip) return prev === STRIP_REGROW_OFF ? prev : STRIP_REGROW_OFF
  if (!m.prevStrip) {
    const known = m.shellPx != null && Number.isFinite(m.shellPx)
    return { entryShellPx: known ? m.shellPx : null, regrowPx: null, unknown: !known, attachCount: m.attachCount }
  }
  if (prev.unknown) return prev
  if (prev.attachCount !== m.attachCount) return { ...prev, unknown: true, regrowPx: null }
  if (prev.entryShellPx == null || m.shellPx == null || !Number.isFinite(m.shellPx)) return prev
  const regrow = Math.max(0, prev.entryShellPx - m.shellPx)
  return prev.regrowPx == null || regrow > prev.regrowPx ? { ...prev, regrowPx: regrow } : prev
}

export function knownRegrow(r: StripRegrow): number | null {
  return r.unknown || r.regrowPx == null ? null : r.regrowPx
}

/** slot 释放 / 审批消失时条带由谁接手（data-tray-handover，门上记录用）。 */
export type TrayHandover = "k12" | "regrow" | "clip" | "fallback" | null

export type TrayBudgetState = {
  squeeze: TraySqueeze
  clip: TrayApprovalClip
  /** 交给 K12 时用的长回量；K12 放掉 / 附件数变即清。 */
  handoverRegrow: number | null
  regrow: StripRegrow
  yield: ClusterYield
  handover: TrayHandover
}

export const TRAY_BUDGET_STATE_OFF: TrayBudgetState = {
  squeeze: TRAY_SQUEEZE_OFF,
  clip: TRAY_APPROVAL_CLIP_OFF,
  handoverRegrow: null,
  regrow: STRIP_REGROW_OFF,
  yield: CLUSTER_YIELD_OFF,
  handover: null
}

/** hook 一次 measure 读到的 DOM 量（全是数，不含节点）。 */
export type TrayBudgetMeasurement = {
  /** trayStripSlot 的输入（slackApplied 由上一帧预算给）。 */
  slot: Omit<TraySlotInput, "slackApplied">
  /** Composer 外壳（表单父级）：scrollHeight / clientHeight / rect 高；没有外壳 → null。 */
  shell: { contentPx: number; boxPx: number; heightPx: number } | null
  /** 对话列 rect 高与 computed min-height（可能 NaN）；没有对话列 → null。 */
  conv: { heightPx: number; floorPx: number } | null
  /** 审批裁切的 DOM 量；没有对话列 → null（裁切路不判）。 */
  clip: {
    footerBottom: number | null
    clipBottom: number | null
    clipH: number | null
    contentNeedPx: number | null
  } | null
  attachCount: number
  /** send / stop 的 rect.bottom（不可见 → null）。 */
  actions?: { sendBottom: number | null; stopBottom: number | null }
  /** rail 判定与当前让出量。 */
  hint?: { present: boolean; rowPx: number | null }
  /** R4 闩键（clusterYieldLatchBoxPx 的结果）。 */
  latchBoxPx?: number | null
}

export type TrayBudgetDecision = {
  strip: boolean
  reclaimSlack: boolean
  slot: number | null
  squeezed: boolean
  approvalClip: boolean
  /** 帽檐 rail 让位（P1-a）。 */
  hintYield: boolean
  /** 让位后仍越线的 px（主路径必须 0）。 */
  residualPx: number
  /** rail 本来要画（谓词结果，门上与 rail 实际 DOM 对照）。 */
  hintPresent: boolean
  handover: TrayHandover
}

export type TrayBudgetStep = { state: TrayBudgetState; budget: TrayBudgetDecision }

function conversationSlackPx(conv: TrayBudgetMeasurement["conv"]): number {
  return conv != null && Number.isFinite(conv.floorPx) ? conv.heightPx - conv.floorPx : 0
}

function overflowOf(m: TrayBudgetMeasurement): number | null {
  if (!m.actions) return null
  const bottoms = [m.actions.sendBottom, m.actions.stopBottom].filter((b): b is number => b != null && Number.isFinite(b))
  if (bottoms.length === 0) return null
  const budget = sendBottomBudget(statusBarBottomEdge({ statusBarTop: m.slot.statusBarTop, viewportHeight: m.slot.viewportHeight }))
  return Math.max(...bottoms) - budget
}

/** 一次 measure：slot → K12 → 审批裁切（含交接）→ slot 释放交接 → 条带 → 长回量 → 让位。 */
export function stepTrayBudget(
  state: TrayBudgetState,
  prev: { strip: boolean; reclaimSlack: boolean; slot?: number | null },
  m: TrayBudgetMeasurement
): TrayBudgetStep {
  const slot = trayStripSlot({ ...m.slot, slackApplied: prev.reclaimSlack })
  const slack = conversationSlackPx(m.conv)
  const prevRegrow = knownRegrow(state.regrow)
  let squeeze = state.squeeze
  let handoverRegrow = state.handoverRegrow
  let clip = state.clip
  let handover: TrayHandover = state.handover
  // K12（P1-c：slot 期照常判，不清零）。C12：条带已画、长回量已知 → needPx 只增不减跟上整托盘内容高。
  if (m.shell) {
    const regrow = handoverRegrow ?? prevRegrow
    if (regrow != null && squeeze.on && prev.strip) {
      squeeze = { ...squeeze, needPx: refreshHandoverNeed(squeeze.needPx, m.shell.contentPx, regrow) }
    }
    squeeze = nextTraySqueeze(squeeze, { contentPx: m.shell.contentPx, boxPx: m.shell.boxPx, conversationSlackPx: slack })
  } else {
    squeeze = TRAY_SQUEEZE_OFF
  }
  if (!squeeze.on) handoverRegrow = null
  if (slot == null && m.clip) {
    const before = clip
    clip = nextTrayApprovalClip(before, {
      footerBottom: m.clip.footerBottom,
      clipBottom: m.clip.clipBottom,
      clipH: m.clip.clipH,
      floorPx: m.conv ? m.conv.floorPx : null,
      contentNeedPx: m.clip.contentNeedPx,
      clusterPx: m.shell ? m.shell.heightPx : null,
      attachCount: m.attachCount,
      stripApplied: prev.strip,
      stripHeldElsewhere: prev.strip && !before.on
    })
    // 审批消失（非几何释放）且条带已画：同一帧按释放后的布局代 K12 判一次，放不下就以 K12 态接手。
    if (before.on && !clip.on && !clip.releasedByGeometry && prev.strip && !squeeze.on && m.shell) {
      const next = squeezeHandoverOnRelease({
        regrowPx: before.regrowUnknown ? null : before.regrowPx,
        contentPx: m.shell.contentPx,
        boxPx: m.shell.boxPx,
        conversationSlackPx: slack
      })
      if (next) {
        squeeze = next
        handoverRegrow = before.regrowPx
        handover = "clip"
      }
    }
  } else {
    clip = TRAY_APPROVAL_CLIP_OFF
  }
  // P1-b：slot 释放同帧交接（不先画 108 再挤回）。
  if (prev.slot != null && slot == null && prev.strip && !clip.on) {
    if (squeeze.on) handover = "k12"
    else if (m.shell && prevRegrow != null) {
      const next = squeezeHandoverOnRelease({
        regrowPx: prevRegrow,
        contentPx: m.shell.contentPx,
        boxPx: m.shell.boxPx,
        conversationSlackPx: slack
      })
      if (next) {
        squeeze = next
        handoverRegrow = prevRegrow
        handover = "regrow"
      }
    } else handover = "fallback"
  }
  if (slot != null) handover = null
  const squeezed = squeeze.on
  const approvalClip = clip.on
  const strip = trayStripFromPaths({ slotStrip: shouldUseTrayStrip(slot), slot, squeezed, approvalClip })
  // fallback 是门上要数的标记（那一帧条带撤、交 K12 自判），保留到 K12 接手或下一次 slot 出现；其余标记随条带结束清。
  // leo F-a：fallback 态最多 1 次 measure——下一次 measure 放不下时 K12 当次进入（strip），标记随即清掉。
  if (strip ? handover === "fallback" : handover !== "fallback") handover = null
  const regrow = nextStripRegrow(state.regrow, {
    prevStrip: prev.strip,
    nextStrip: strip,
    shellPx: m.shell ? m.shell.heightPx : null,
    attachCount: m.attachCount
  })
  const overflowPx = overflowOf(m)
  const hintPresent = m.hint?.present ?? false
  const yieldBefore = state.yield
  const clusterYield = nextClusterYield(yieldBefore, {
    hintPresent,
    hintRowPx: m.hint?.rowPx ?? null,
    prevStrip: prev.strip,
    nextStrip: strip,
    overflowPx,
    slackPx: m.conv != null && Number.isFinite(m.conv.floorPx) ? m.conv.heightPx - m.conv.floorPx : null,
    boxPx: m.latchBoxPx ?? null,
    attachCount: m.attachCount
  })
  // 进入那一帧量的是让位前的布局，残差下一次 measure 再算。
  const residualPx =
    clusterYield.on && yieldBefore.on && overflowPx != null && overflowPx > CLUSTER_YIELD_SUBPIXEL_PX ? Math.round(overflowPx) : 0
  return {
    state: { squeeze, clip, handoverRegrow, regrow, yield: clusterYield, handover },
    budget: {
      strip,
      reclaimSlack: strip,
      slot: slot == null ? null : Math.round(slot),
      squeezed,
      approvalClip,
      hintYield: clusterYield.on,
      residualPx,
      hintPresent,
      handover
    }
  }
}
