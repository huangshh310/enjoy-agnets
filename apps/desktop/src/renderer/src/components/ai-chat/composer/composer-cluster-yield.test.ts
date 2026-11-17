/**
 * 446 刀：stepTrayBudget 编排 / 让位 / 统一长回量 / 谓词。
 * 提交 1（纯重构）：与抽取前 hook 内联逻辑逐帧等价（leo M3）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
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
import {
  stepTrayBudget,
  TRAY_BUDGET_STATE_OFF,
  type TrayBudgetDecision,
  type TrayBudgetMeasurement,
  type TrayBudgetState
} from "./composer-cluster-yield.ts"

/** d9bdb7e2 use-composer-tray-budget.ts measure() 的原样副本（只把 DOM 读数换成 measurement 字段）。 */
function legacyMeasure(
  refs: { squeeze: TraySqueeze; clip: TrayApprovalClip; handoverRegrow: number | null },
  prev: TrayBudgetDecision,
  m: TrayBudgetMeasurement
): TrayBudgetDecision {
  const convHeight = m.conv ? m.conv.heightPx : null
  const convFloor = m.conv ? m.conv.floorPx : null
  const slot = trayStripSlot({ ...(m.slot as Omit<TraySlotInput, "slackApplied">), slackApplied: prev.reclaimSlack })
  const shell = m.shell
  if (slot == null && shell) {
    const slack = convHeight != null && convFloor != null && Number.isFinite(convFloor) ? convHeight - convFloor : 0
    if (refs.handoverRegrow != null && refs.squeeze.on && prev.strip) {
      refs.squeeze = { ...refs.squeeze, needPx: refreshHandoverNeed(refs.squeeze.needPx, shell.contentPx, refs.handoverRegrow) }
    }
    refs.squeeze = nextTraySqueeze(refs.squeeze, { contentPx: shell.contentPx, boxPx: shell.boxPx, conversationSlackPx: slack })
  } else {
    refs.squeeze = TRAY_SQUEEZE_OFF
  }
  if (!refs.squeeze.on) refs.handoverRegrow = null
  if (slot == null && m.clip) {
    const before = refs.clip
    refs.clip = nextTrayApprovalClip(before, {
      footerBottom: m.clip.footerBottom,
      clipBottom: m.clip.clipBottom,
      clipH: m.clip.clipH,
      floorPx: convFloor,
      contentNeedPx: m.clip.contentNeedPx,
      clusterPx: shell ? shell.heightPx : null,
      attachCount: m.attachCount,
      stripApplied: prev.strip,
      stripHeldElsewhere: prev.strip && !before.on
    })
    if (before.on && !refs.clip.on && !refs.clip.releasedByGeometry && prev.strip && !refs.squeeze.on && shell) {
      const handover = squeezeHandoverOnRelease({
        regrowPx: before.regrowUnknown ? null : before.regrowPx,
        contentPx: shell.contentPx,
        boxPx: shell.boxPx,
        conversationSlackPx: convHeight != null && convFloor != null && Number.isFinite(convFloor) ? convHeight - convFloor : 0
      })
      if (handover) {
        refs.squeeze = handover
        refs.handoverRegrow = before.regrowPx
      }
    }
  } else {
    refs.clip = TRAY_APPROVAL_CLIP_OFF
  }
  const squeezed = refs.squeeze.on
  const approvalClip = refs.clip.on
  const strip = trayStripFromPaths({ slotStrip: shouldUseTrayStrip(slot), slot, squeezed, approvalClip })
  return { strip, reclaimSlack: strip, slot: slot == null ? null : Math.round(slot), squeezed, approvalClip }
}

const IDLE: TrayBudgetDecision = { strip: false, reclaimSlack: false, slot: null, squeezed: false, approvalClip: false }

export function meas(p: {
  frameBottom?: number | null
  bar?: number
  vh?: number
  form?: number
  content?: number
  box?: number
  shellH?: number
  convH?: number | null
  floor?: number
  footer?: number | null
  clipBottom?: number | null
  clipH?: number | null
  need?: number | null
  attach?: number
}): TrayBudgetMeasurement {
  const convH = p.convH === undefined ? 56 : p.convH
  return {
    slot: {
      statusBarTop: p.bar ?? 443,
      viewportHeight: p.vh ?? 480,
      formHeight: p.form ?? 162,
      frameBottom: p.frameBottom ?? null,
      conversationHeight: convH,
      conversationFloor: convH == null ? null : (p.floor ?? 56)
    },
    shell: { contentPx: p.content ?? 300, boxPx: p.box ?? 300, heightPx: p.shellH ?? p.box ?? 300 },
    conv: convH == null ? null : { heightPx: convH, floorPx: p.floor ?? 56 },
    clip: convH == null ? null : { footerBottom: p.footer ?? null, clipBottom: p.clipBottom ?? null, clipH: p.clipH ?? null, contentNeedPx: p.need ?? null },
    attachCount: p.attach ?? 1
  }
}

function runBoth(seq: TrayBudgetMeasurement[]) {
  const hits = { strip: 0, squeezed: 0, clip: 0, slot: 0 }
  const refs = { squeeze: TRAY_SQUEEZE_OFF, clip: TRAY_APPROVAL_CLIP_OFF, handoverRegrow: null as number | null }
  let state: TrayBudgetState = TRAY_BUDGET_STATE_OFF
  let a = IDLE
  let b = IDLE
  seq.forEach((m, i) => {
    a = legacyMeasure(refs, a, m)
    const step = stepTrayBudget(state, b, m)
    state = step.state
    b = step.budget
    assert.deepEqual(b, a, `frame ${i}`)
    assert.deepEqual(state.squeeze, refs.squeeze, `squeeze ${i}`)
    assert.deepEqual(state.clip, refs.clip, `clip ${i}`)
    assert.equal(state.handoverRegrow, refs.handoverRegrow, `handover ${i}`)
    if (b.strip) hits.strip++
    if (b.squeezed) hits.squeezed++
    if (b.approvalClip) hits.clip++
    if (b.slot != null) hits.slot++
  })
  return hits
}

test("M3 等价：#230 审批裁切 进入 → 长回量 → 审批消失交接 → K12 → 拖宽释放", () => {
  runBoth([
    meas({ content: 300, box: 300, shellH: 300 }),
    meas({ footer: 470, clipBottom: 440, clipH: 200, shellH: 300 }),
    meas({ footer: 470, clipBottom: 440, clipH: 200, shellH: 241 }),
    meas({ footer: 440, clipBottom: 440, clipH: 200, shellH: 233, content: 233, box: 233 }),
    meas({ footer: null, content: 233, box: 233, shellH: 233 }),
    meas({ content: 236, box: 233, shellH: 233 }),
    meas({ content: 236, box: 233, convH: 80, vh: 520, bar: 483 }),
    meas({ content: 236, box: 233, convH: 400, vh: 900, bar: 863 })
  ])
})

test("M3 等价：#224 slot 进出、K12 在 slot 期清零（现网）", () => {
  runBoth([
    meas({ frameBottom: 209, content: 330, box: 300 }),
    meas({ frameBottom: 209, content: 330, box: 300 }),
    meas({ frameBottom: 260, content: 330, box: 300 }),
    meas({ frameBottom: null, content: 330, box: 300 }),
    meas({ frameBottom: null, content: 300, box: 300 })
  ])
})

test("M3 等价：几何释放 / R4 闩 / 地板 NaN / 附件数变 / 无对话列（随机 4000 帧，种子固定）", () => {
  let seed = 446
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const seq: TrayBudgetMeasurement[] = []
  for (let i = 0; i < 4000; i++) {
    seq.push(
      meas({
        frameBottom: pick([null, null, 209, 230, 160]),
        bar: pick([443, 467, 473, 521]),
        vh: pick([480, 510, 558]),
        form: pick([162, 192]),
        content: pick([230, 260, 300, 330]),
        box: pick([230, 260, 300]),
        shellH: pick([230, 241, 260, 300]),
        convH: pick([56, 60, 90, 200, null]),
        floor: pick([56, 56, Number.NaN]),
        footer: pick([null, 440, 470]),
        clipBottom: pick([null, 440]),
        clipH: pick([120, 200, 260]),
        need: pick([null, 150, 220]),
        attach: pick([1, 1, 1, 2])
      })
    )
  }
  const hits = runBoth(seq)
  // 随机序列必须真的走到各路（否则等价是空话）。
  assert.ok(hits.strip > 100 && hits.squeezed > 50 && hits.clip > 20 && hits.slot > 100, JSON.stringify(hits))
})
