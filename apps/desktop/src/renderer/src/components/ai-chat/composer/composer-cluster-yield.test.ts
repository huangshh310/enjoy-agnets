/**
 * 446 刀：stepTrayBudget 编排 / 让位 / 统一长回量 / 谓词。
 * 提交 1（纯重构，802c584d）：与抽取前 hook 内联逻辑逐帧等价（leo M3）。提交 2 起 P1-a/b/c 有意改变行为：
 * 等价断言只保留在行为不该变的子集（无验收框、无帽檐提示、无 send/stop 量），其余由下面的行为单测钉住。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  enqueueFollowup,
  pauseFollowups,
  resetFollowupsForTest,
  setFollowupPersistEnabledForTest,
  setRuntimeHint
} from "@renderer/hooks/followup-queue"
import { runtimeHintPlacement } from "./runtime-interact/runtime-hint-placement.ts"
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
  CLUSTER_YIELD_OFF,
  clusterYieldLatchBoxPx,
  followupRailWouldRender,
  hintRowPx,
  nextClusterYield,
  nextStripRegrow,
  STRIP_REGROW_OFF,
  stepTrayBudget,
  TRAY_BUDGET_STATE_OFF,
  admitTrayRemeasure,
  TRAY_REMEASURE_PER_FRAME,
  trayBudgetCommit,
  type ClusterYield,
  type ClusterYieldInput,
  type LatchNode,
  type TrayBudgetDecision,
  type TrayBudgetMeasurement,
  type TrayBudgetState
} from "./composer-cluster-yield.ts"

/** d9bdb7e2 use-composer-tray-budget.ts measure() 的原样副本（只把 DOM 读数换成 measurement 字段）。 */
function legacyMeasure(
  refs: { squeeze: TraySqueeze; clip: TrayApprovalClip; handoverRegrow: number | null },
  prev: LegacyDecision,
  m: TrayBudgetMeasurement
): LegacyDecision {
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

type LegacyDecision = Pick<TrayBudgetDecision, "strip" | "reclaimSlack" | "slot" | "squeezed" | "approvalClip">
const IDLE: LegacyDecision = { strip: false, reclaimSlack: false, slot: null, squeezed: false, approvalClip: false }
const pickLegacy = (d: TrayBudgetDecision): LegacyDecision => ({
  strip: d.strip,
  reclaimSlack: d.reclaimSlack,
  slot: d.slot,
  squeezed: d.squeezed,
  approvalClip: d.approvalClip
})

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
  let full: TrayBudgetDecision = { ...IDLE, hintYield: false, residualPx: 0, hintPresent: false, handover: null }
  let b = IDLE
  seq.forEach((m, i) => {
    a = legacyMeasure(refs, a, m)
    const step = stepTrayBudget(state, full, m)
    state = step.state
    full = step.budget
    b = pickLegacy(full)
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

// ---------- P1-a 让位 ----------

const Y = (p: Partial<ClusterYieldInput> = {}): ClusterYieldInput => ({
  hintPresent: true,
  hintRowPx: 29,
  prevStrip: true,
  nextStrip: true,
  overflowPx: 16,
  slackPx: 0,
  boxPx: 400,
  attachCount: 1,
  ...p
})

test("R1 rowPx：唯一可见子项 = 框高 + computed mb（733×480 35、>640 39）；否则子行高 29", () => {
  assert.equal(hintRowPx({ railPx: 29, framePx: 31, frameMarginBottomPx: 4, sole: true }), 35)
  assert.equal(hintRowPx({ railPx: 29, framePx: 31, frameMarginBottomPx: 8, sole: true }), 39)
  assert.equal(hintRowPx({ railPx: 29, framePx: 55, frameMarginBottomPx: 4, sole: false }), 29)
  assert.equal(hintRowPx({ railPx: 29, framePx: 31, frameMarginBottomPx: Number.NaN, sole: true }), 31)
})

test("C1 进入：只在条带已画（上一帧与本帧）且越线 > 0.5 时；非条带越线 / 本帧翻转 / 量不到行高都不进", () => {
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y()).on, true)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y()).rowPx, 29)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ prevStrip: false })).on, false)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ nextStrip: false })).on, false)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ overflowPx: 0.5 })).on, false)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ overflowPx: null })).on, false)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ hintRowPx: null })).on, false)
  assert.equal(nextClusterYield(CLUSTER_YIELD_OFF, Y({ hintPresent: false })), CLUSTER_YIELD_OFF)
})

test("luna §9.4 四组数：整框 35 时余量 37 保持、45 放回；只算 29 时 37 就放（会振荡）", () => {
  const on35: ClusterYield = { ...CLUSTER_YIELD_OFF, on: true, rowPx: 35, attachCount: 1 }
  assert.equal(nextClusterYield(on35, Y({ slackPx: 37, overflowPx: -6 })).on, true)
  assert.equal(nextClusterYield(on35, Y({ slackPx: 42, overflowPx: -6 })).on, true)
  assert.equal(nextClusterYield(on35, Y({ slackPx: 43, overflowPx: -6 })).on, false)
  assert.equal(nextClusterYield(on35, Y({ slackPx: 45, overflowPx: -6 })).on, false)
  const on29: ClusterYield = { ...on35, rowPx: 29 }
  assert.equal(nextClusterYield(on29, Y({ slackPx: 37, overflowPx: -6 })).on, false)
})

test("C2′ 放回：提示消失立即放并清闩；本帧条带翻转推迟；地板不可用只等提示消失；仍越线不放", () => {
  const on: ClusterYield = { ...CLUSTER_YIELD_OFF, on: true, rowPx: 29, blockedBelowPx: 400, attachCount: 1 }
  assert.equal(nextClusterYield(on, Y({ hintPresent: false })), CLUSTER_YIELD_OFF)
  const free = { ...on, blockedBelowPx: null }
  assert.equal(nextClusterYield(free, Y({ slackPx: 100, overflowPx: -20, nextStrip: false })).on, true)
  assert.equal(nextClusterYield(free, Y({ slackPx: null, overflowPx: -20 })).on, true)
  assert.equal(nextClusterYield(free, Y({ slackPx: 100, overflowPx: 3 })).on, true)
  const released = nextClusterYield(free, Y({ slackPx: 100, overflowPx: -20 }))
  assert.equal(released.on, false)
  assert.equal(released.releasedByGeometry, true)
})

/** 简化几何：对话区余量 = base + (让位 ? rowPx : 0)；越线 = need − base − (让位 ? rowPx : 0)。 */
function simulate(bases: number[], opts: { need: number; rowPx: number; box: (base: number, yielded: boolean) => number }) {
  let y = CLUSTER_YIELD_OFF
  let flips = 0
  for (const base of bases) {
    const yielded = y.on
    const slack = base + (yielded ? opts.rowPx : 0)
    const overflow = opts.need - base - (yielded ? opts.rowPx : 0)
    const next = nextClusterYield(y, Y({ hintRowPx: yielded ? null : opts.rowPx, slackPx: slack, overflowPx: overflow, boxPx: opts.box(base, yielded) }))
    if (next.on !== y.on) flips++
    y = next
  }
  return { flips, y }
}

test("±6 往返：余量在阈值附近来回 ±6，让位 / 放回不来回跳（size 容器做闩键）", () => {
  // need 16：base 0 时越线 16；让位后越线 −13、余量 29。放回需余量 ≥ 37 → base ≥ 8。
  const bases: number[] = []
  for (let i = 0; i < 40; i++) bases.push(i % 2 === 0 ? 10 : 4, 16, 10)
  const sized = simulate([0, ...bases], { need: 16, rowPx: 29, box: (base) => 400 + base })
  assert.ok(sized.flips <= 3, `flips ${sized.flips}`)
})

test("R4 闩（leo Q-6）：几何放回后又重进 → 闩 = 重进时 size 容器高；自身 29 的往返解不开，容器 +8 才放", () => {
  let y: ClusterYield = { ...CLUSTER_YIELD_OFF, releasedByGeometry: true, attachCount: 1 }
  y = nextClusterYield(y, Y({ boxPx: 400 }))
  assert.equal(y.on, true)
  assert.equal(y.blockedBelowPx, 400)
  // 让位后余量充足，但容器高没变：保持。
  assert.equal(nextClusterYield(y, Y({ slackPx: 100, overflowPx: -20, boxPx: 400 })).on, true)
  assert.equal(nextClusterYield(y, Y({ slackPx: 100, overflowPx: -20, boxPx: 407 })).on, true)
  assert.equal(nextClusterYield(y, Y({ slackPx: 100, overflowPx: -20, boxPx: 408 })).on, false)
  // 清闩：附件数变、提示消失。
  assert.equal(nextClusterYield(y, Y({ slackPx: 100, overflowPx: -20, boxPx: 400, attachCount: 2 })).on, false)
  assert.equal(nextClusterYield(y, Y({ hintPresent: false })).blockedBelowPx, null)
})

test("R4 闩键取 size 容器、不取对话外壳（变异：换成对话外壳 → 往返被自身 29 解开 → 红）", () => {
  // 假节点树：对话列 → 对话外壳（随让位 +29）→ size 容器（恒 400）。
  const key = (yielded: boolean) => {
    const sizeBox: LatchNode = { parentElement: null, getBoundingClientRect: () => ({ height: 400 }) }
    const shell: LatchNode = { parentElement: sizeBox, getBoundingClientRect: () => ({ height: 120 + (yielded ? 29 : 0) }) }
    const conversation: LatchNode = { parentElement: shell, getBoundingClientRect: () => ({ height: 80 + (yielded ? 29 : 0) }) }
    return clusterYieldLatchBoxPx(conversation)
  }
  assert.equal(key(false), 400)
  assert.equal(clusterYieldLatchBoxPx(null), null)
  let y: ClusterYield = { ...CLUSTER_YIELD_OFF, releasedByGeometry: true, attachCount: 1 }
  y = nextClusterYield(y, Y({ boxPx: key(false) }))
  assert.equal(y.on, true)
  // 让位后：对话外壳 +29（≥8），若键是对话外壳就会放回、再越线、再让位——来回翻。
  const after = nextClusterYield(y, Y({ slackPx: 100, overflowPx: -20, boxPx: key(true) }))
  assert.equal(after.on, true)
})

// ---------- 统一长回量 / P1-b / P1-c / C12 ----------

test("统一长回量：进入记外壳高，之后只增不减；附件数变作废；条带结束清", () => {
  let r = nextStripRegrow(STRIP_REGROW_OFF, { prevStrip: false, nextStrip: true, shellPx: 300, attachCount: 1 })
  assert.equal(r.entryShellPx, 300)
  r = nextStripRegrow(r, { prevStrip: true, nextStrip: true, shellPx: 241, attachCount: 1 })
  assert.equal(r.regrowPx, 59)
  r = nextStripRegrow(r, { prevStrip: true, nextStrip: true, shellPx: 233, attachCount: 1 })
  assert.equal(r.regrowPx, 67)
  r = nextStripRegrow(r, { prevStrip: true, nextStrip: true, shellPx: 260, attachCount: 1 })
  assert.equal(r.regrowPx, 67)
  assert.equal(nextStripRegrow(r, { prevStrip: true, nextStrip: true, shellPx: 233, attachCount: 2 }).unknown, true)
  assert.equal(nextStripRegrow(r, { prevStrip: true, nextStrip: false, shellPx: 300, attachCount: 1 }), STRIP_REGROW_OFF)
})

function stepSeq(seq: Array<{ m: TrayBudgetMeasurement }>) {
  let state: TrayBudgetState = TRAY_BUDGET_STATE_OFF
  let budget: TrayBudgetDecision = { ...IDLE, hintYield: false, residualPx: 0, hintPresent: false, handover: null }
  const out: TrayBudgetDecision[] = []
  for (const { m } of seq) {
    const step = stepTrayBudget(state, budget, m)
    state = step.state
    budget = step.budget
    out.push(budget)
  }
  return { out, state }
}

test("P1-c：slot ≥108 但外壳放不下 → K12 照常进，条带 = slotStrip ‖ squeezed（733×510 批准后 511）", () => {
  // bar 473 / vh 510：slot = 460 − 132 − (209+8) = 111 ≥ 108；外壳内容 330 > 盒 300。
  const { out } = stepSeq([
    { m: meas({ frameBottom: 209, bar: 473, vh: 510, form: 162, content: 330, box: 300 }) },
    { m: meas({ frameBottom: 209, bar: 473, vh: 510, form: 132, content: 280, box: 300, shellH: 300 }) }
  ])
  assert.ok(out[0].slot != null && out[0].slot >= 108)
  assert.equal(out[0].squeezed, true)
  assert.equal(out[0].strip, true)
  assert.equal(out[1].strip, true)
})

test("C4′ 交接三分支：K12 已开 → k12；K12 关 + 长回量已知 → regrow 同帧接手（0 帧 108）；未知 → fallback", () => {
  const slotOn = (p = {}) => meas({ frameBottom: 209, content: 233, box: 233, shellH: 233, ...p })
  const release = (p = {}) => meas({ frameBottom: null, content: 233, box: 233, shellH: 233, ...p })
  // 1) K12 开
  let r = stepSeq([{ m: slotOn({ content: 300, box: 233 }) }, { m: slotOn({ content: 300, box: 233 }) }, { m: release({ content: 300 }) }])
  assert.equal(r.out[2].strip, true)
  assert.equal(r.out[2].handover, "k12")
  // 2) K12 关、长回量已知（进条前外壳 300 → 条带 233）：释放后放不下 → regrow 接手
  r = stepSeq([
    { m: slotOn({ shellH: 300, box: 300, content: 300 }) },
    { m: slotOn() },
    { m: slotOn() },
    { m: release() }
  ])
  assert.equal(r.out[3].strip, true)
  assert.equal(r.out[3].squeezed, true)
  assert.equal(r.out[3].handover, "regrow")
  // 释放后放得下（对话区余量大）→ 直接放，不交接
  r = stepSeq([{ m: slotOn({ shellH: 300, box: 300, content: 300 }) }, { m: slotOn() }, { m: release({ convH: 400 }) }])
  assert.equal(r.out[2].strip, false)
  // 3) 附件数变 → 长回量未知 → fallback
  r = stepSeq([
    { m: slotOn({ shellH: 300, box: 300, content: 300 }) },
    { m: slotOn() },
    { m: slotOn({ attach: 2 }) },
    { m: release({ attach: 2 }) }
  ])
  assert.equal(r.out[3].handover, "fallback")
})

test("C12 守门：内容不变时 needPx 恒等（#228 K12 进入 → 条带 → 拖宽序列）；内容变高才只增", () => {
  // K12 自己进：内容 330 > 盒 300（盒高封顶），条带后外壳盒 = 263，内容 263。
  const seq = [
    meas({ content: 330, box: 300, shellH: 300 }),
    meas({ content: 263, box: 263, shellH: 263 }),
    meas({ content: 263, box: 263, shellH: 263 }),
    meas({ content: 263, box: 263, shellH: 263, convH: 60 }),
    meas({ content: 263, box: 263, shellH: 263, convH: 90 })
  ]
  const { state } = stepSeq(seq.map((m) => ({ m })))
  assert.equal(state.squeeze.needPx, 330)
  // 内容 +29（提示放回）→ needPx 跟上 263 + 29 + 37 = 329？不：只增，max(330, 292+37) = 330；再高才变。
  const grown = stepTrayBudget(state, { strip: true, reclaimSlack: true, slot: null }, meas({ content: 300, box: 263, shellH: 263 }))
  assert.equal(grown.state.squeeze.needPx, 337)
})

test("C12：733×480 K12 条态拉宽到 1024，释放点不后移（needPx 不变 → 余量 ≥ need + 8 的那一步）", () => {
  const legacyRefs = { squeeze: TRAY_SQUEEZE_OFF, clip: TRAY_APPROVAL_CLIP_OFF, handoverRegrow: null as number | null }
  let legacy = IDLE
  let state: TrayBudgetState = TRAY_BUDGET_STATE_OFF
  let budget: TrayBudgetDecision = { ...IDLE, hintYield: false, residualPx: 0, hintPresent: false, handover: null }
  const steps = [meas({ content: 330, box: 300, shellH: 300 })]
  for (let conv = 56; conv <= 160; conv += 4) steps.push(meas({ content: 263, box: 263, shellH: 263, convH: conv }))
  let releaseLegacy = -1
  let releaseNew = -1
  steps.forEach((m, i) => {
    legacy = legacyMeasure(legacyRefs, legacy, m)
    const step = stepTrayBudget(state, budget, m)
    state = step.state
    budget = step.budget
    if (releaseLegacy < 0 && i > 0 && !legacy.strip) releaseLegacy = i
    if (releaseNew < 0 && i > 0 && !budget.strip) releaseNew = i
  })
  assert.ok(releaseLegacy > 0)
  assert.equal(releaseNew, releaseLegacy)
})

test("C11 顺序：让位只在条带已提交的下一次 measure 判；进入那帧 residual 记 0、下一帧按让位后布局算", () => {
  const base = { frameBottom: 209, content: 233, box: 233, shellH: 233 }
  const withHint = (send: number) => ({
    ...meas(base),
    actions: { sendBottom: send, stopBottom: send },
    hint: { present: true, rowPx: 29 },
    latchBoxPx: 400
  })
  const { out } = stepSeq([{ m: withHint(446) }, { m: withHint(446) }, { m: { ...withHint(417), hint: { present: true, rowPx: null } } }])
  assert.equal(out[0].strip, true)
  assert.equal(out[0].hintYield, false, "条带首帧（上一帧未画条）不进")
  assert.equal(out[1].hintYield, true)
  assert.equal(out[1].residualPx, 0)
  assert.equal(out[2].hintYield, true)
  assert.equal(out[2].residualPx, 0)
})

// ---------- M1 谓词 ----------

test("M1 谓词真值表：有提示 / 无 × 审批在 / 不在 × paused × 队列 0 / 2，与 runtimeHintPlacement 原式一致", () => {
  setFollowupPersistEnabledForTest(false)
  for (const code of [null, "queued", "steered", "imageSteerQueued"] as const) {
    for (const approval of [false, true]) {
      for (const paused of [false, true]) {
        for (const queued of [0, 2]) {
          resetFollowupsForTest()
          for (let i = 0; i < queued; i++) enqueueFollowup({ sessionId: "s1", prompt: `q${i}` } as Parameters<typeof enqueueFollowup>[0])
          if (paused) pauseFollowups("s1", "stopped")
          setRuntimeHint(code, "s1")
          const expected = code == null ? false : runtimeHintPlacement(code, approval, queued, paused) === "frame"
          assert.equal(followupRailWouldRender("s1", approval), expected, `${code} ${approval} ${paused} ${queued}`)
          // 别的会话不显示
          assert.equal(followupRailWouldRender("s2", approval), false)
        }
      }
    }
  }
  resetFollowupsForTest()
  setRuntimeHint(null)
})

test("M1 / C1 源码断言：rail 只用谓词判显示；hook 不写 store、flushSync 只经 trayBudgetCommit；不写死 430 / 443 / 29 / 35", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const rail = readFileSync(join(dir, "runtime-interact/composer-followup-rail.tsx"), "utf8")
  assert.match(rail, /followupRailWouldRender\(sessionId, approvalPending\)/)
  assert.equal(rail.includes("runtimeHintPlacement("), false)
  const hook = readFileSync(join(dir, "use-composer-tray-budget.ts"), "utf8")
  assert.equal(/setRuntimeHint|enqueueFollowup|takeFollowup/.test(hook), false)
  assert.equal((hook.match(/flushSync\(/g) ?? []).length, 1)
  assert.match(hook, /if \(commit === "flush"\) flushSync/)
  const pure = readFileSync(join(dir, "composer-cluster-yield.ts"), "utf8")
  for (const src of [hook, pure]) {
    for (const lit of [/\b430\b/, /\b443\b/, /\b29\b/, /\b35\b/, /\b39\b/]) assert.equal(lit.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), false, `${lit}`)
    assert.equal(/document\.|getComputedStyle/.test(pure.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), false)
  }
  const frame = readFileSync(join(dir, "stacked-rail/composer-activity-frame.tsx"), "utf8")
  assert.match(frame, /hintYield \? " \[&:not\(:has\(>:not\(:empty\)\)\)\]:hidden" : ""/)
})

// ---------- M4′ 守门 G1 / G2 与 T2 选项字面 ----------

const IDLE_DECISION: TrayBudgetDecision = { ...IDLE, hintYield: false, residualPx: 0, hintPresent: false, handover: null }

test("G1：输出不变时重测 setState 次数 = 0（变异：去掉比较直接 setState → 红）", () => {
  // 先收敛到稳态（首两步 slot / reclaimSlack 会翻），之后同一份 DOM 读数反复重测。
  let state = TRAY_BUDGET_STATE_OFF
  let budget = IDLE_DECISION
  for (let i = 0; i < 4; i++) {
    const step = stepTrayBudget(state, budget, meas({ form: 120, frameBottom: 300 }))
    state = step.state
    budget = step.budget
  }
  let setCount = 0
  for (let i = 0; i < 6; i++) {
    const step = stepTrayBudget(state, budget, meas({ form: 120, frameBottom: 300 }))
    state = step.state
    const commit = trayBudgetCommit(budget, step.budget, i % 2 === 0)
    if (commit !== "none") setCount++
    budget = step.budget
  }
  assert.equal(setCount, 0)
  // 翻转且 sync → flush；翻转但非 sync（layout effect）→ set；只 slot 变 → set。
  assert.equal(trayBudgetCommit(IDLE_DECISION, { ...IDLE_DECISION, strip: true }, true), "flush")
  assert.equal(trayBudgetCommit(IDLE_DECISION, { ...IDLE_DECISION, hintYield: true }, false), "set")
  assert.equal(trayBudgetCommit(IDLE_DECISION, { ...IDLE_DECISION, slot: 83 }, true), "set")
})

test("G2：同帧第 3 次 T2 重测被拒（变异：去掉上限 → 红）", () => {
  assert.equal(TRAY_REMEASURE_PER_FRAME, 2)
  let count = 0
  const admits: boolean[] = []
  for (let i = 0; i < 3; i++) {
    const r = admitTrayRemeasure(count)
    admits.push(r.admit)
    count = r.count
  }
  assert.deepEqual(admits, [true, true, false])
  // rAF 复位后重新放行。
  assert.equal(admitTrayRemeasure(0).admit, true)
})

test("T2 源码断言：MO 只 childList；订阅回调不 measure；T1 已按 V1 删除", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "use-composer-tray-budget.ts"), "utf8")
  assert.match(src, /REVIEW_FRAME_MUTATION_OPTIONS: MutationObserverInit = \{ childList: true \}/)
  assert.doesNotMatch(src, /subtree:|attributes:|characterData:/)
  const moCalls = src.match(/mutations\??\.observe\([^)]*\)/g) ?? []
  assert.equal(moCalls.length, 3)
  for (const call of moCalls) assert.match(call, /, REVIEW_FRAME_MUTATION_OPTIONS\)$/)
  assert.doesNotMatch(src, /subscribeFollowups\(\(\) => measure/)
  const assets = src.slice(src.indexOf("subscribeComposerAssets((items)"), src.indexOf("return () => {"))
  assert.doesNotMatch(assets, /measure\(/)
  // V1：T1（提交时 layout effect 重测）删后全绿 → 按 leo M4′ 删掉，不留死代码。
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /useSyncExternalStore|railWouldRender|attachLength/)
})
