/**
 * 托盘预算一次 measure 的纯编排（leo M3 / C11）：hook 只读 DOM、setState，这里按固定顺序调用既有纯函数，
 * 不碰 document / getComputedStyle，不改被调函数本体（trayStripSlot、shouldUseTrayStrip、nextTraySqueeze、
 * nextTrayApprovalClip、trayStripFromPaths、squeezeHandoverOnRelease、refreshHandoverNeed）。
 */
import { shouldUseTrayStrip, trayStripSlot, type TraySlotInput } from "./composer-tray-leftover.ts"
import { nextTraySqueeze, TRAY_SQUEEZE_OFF, type TraySqueeze } from "./composer-tray-squeeze.ts"
import {
  nextTrayApprovalClip,
  refreshHandoverNeed,
  squeezeHandoverOnRelease,
  TRAY_APPROVAL_CLIP_OFF,
  trayStripFromPaths,
  type TrayApprovalClip
} from "./composer-tray-approval-clip.ts"

export type TrayBudgetState = {
  squeeze: TraySqueeze
  clip: TrayApprovalClip
  /** 审批消失时交给 K12 的长回量；K12 放掉 / 附件数变即清。 */
  handoverRegrow: number | null
}

export const TRAY_BUDGET_STATE_OFF: TrayBudgetState = {
  squeeze: TRAY_SQUEEZE_OFF,
  clip: TRAY_APPROVAL_CLIP_OFF,
  handoverRegrow: null
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
}

export type TrayBudgetDecision = {
  strip: boolean
  reclaimSlack: boolean
  slot: number | null
  squeezed: boolean
  approvalClip: boolean
}

export type TrayBudgetStep = { state: TrayBudgetState; budget: TrayBudgetDecision }

function conversationSlackPx(conv: TrayBudgetMeasurement["conv"]): number {
  return conv != null && Number.isFinite(conv.floorPx) ? conv.heightPx - conv.floorPx : 0
}

/** 一次 measure：slot → K12 → 审批裁切（含交接）→ 条带。 */
export function stepTrayBudget(
  state: TrayBudgetState,
  prev: { strip: boolean; reclaimSlack: boolean },
  m: TrayBudgetMeasurement
): TrayBudgetStep {
  const slot = trayStripSlot({ ...m.slot, slackApplied: prev.reclaimSlack })
  const slack = conversationSlackPx(m.conv)
  let squeeze = state.squeeze
  let handoverRegrow = state.handoverRegrow
  let clip = state.clip
  // 没有验收框时的兜底：只看 Composer 外壳自己内容放不放得下。
  if (slot == null && m.shell) {
    if (handoverRegrow != null && squeeze.on && prev.strip) {
      squeeze = { ...squeeze, needPx: refreshHandoverNeed(squeeze.needPx, m.shell.contentPx, handoverRegrow) }
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
      const handover = squeezeHandoverOnRelease({
        regrowPx: before.regrowUnknown ? null : before.regrowPx,
        contentPx: m.shell.contentPx,
        boxPx: m.shell.boxPx,
        conversationSlackPx: slack
      })
      if (handover) {
        squeeze = handover
        handoverRegrow = before.regrowPx
      }
    }
  } else {
    clip = TRAY_APPROVAL_CLIP_OFF
  }
  const squeezed = squeeze.on
  const approvalClip = clip.on
  const strip = trayStripFromPaths({ slotStrip: shouldUseTrayStrip(slot), slot, squeezed, approvalClip })
  return {
    state: { squeeze, clip, handoverRegrow },
    budget: { strip, reclaimSlack: strip, slot: slot == null ? null : Math.round(slot), squeezed, approvalClip }
  }
}
