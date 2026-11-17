import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  APPROVAL_CLIP_RELEASE_PX,
  nextTrayApprovalClip,
  refreshHandoverNeed,
  squeezeHandoverOnRelease,
  TRAY_APPROVAL_CLIP_OFF,
  trayStripFromPaths,
  type TrayApprovalClip,
  type TrayApprovalClipInput
} from "./composer-tray-approval-clip.ts"

// 数字来自 luna 设计稿 §2（main@d4ad6b93 真机，733×480 运行中）：q2 = 排队 2，q0 = 无排队。
const base: TrayApprovalClipInput = {
  footerBottom: null,
  clipBottom: null,
  clipH: null,
  floorPx: 80.5,
  clusterPx: 258,
  attachCount: 1,
  stripApplied: false
}
const m = (over: Partial<TrayApprovalClipInput>): TrayApprovalClipInput => ({ ...base, ...over })

/** 进入（展开 q2）→ 条带首帧，返回条带态。 */
function enterQ2(): TrayApprovalClip {
  const s1 = nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 208, clipBottom: 185, clipH: 64, clusterPx: 258 }))
  assert.equal(s1.on, true)
  const s2 = nextTrayApprovalClip(s1, m({ footerBottom: 247, clipBottom: 252, clipH: 131, clusterPx: 191, stripApplied: true }))
  assert.equal(s2.on, true)
  assert.equal(s2.regrowPx, 67)
  return s2
}

test("B′ 进入：展开 q2 208/185、q0 204/179 → 转条；紧凑 215/220、209/214 → 不转", () => {
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 208, clipBottom: 185, clipH: 64 })).on, true)
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 204, clipBottom: 179, clipH: 58, clusterPx: 264 })).on, true)
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 215, clipBottom: 220, clipH: 99, clusterPx: 223 })).on, false)
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 209, clipBottom: 214, clipH: 93, clusterPx: 229 })).on, false)
  // 1024×670 / 1440×920 审批 + 展开 108：gap +13 → 不转（零变化）
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 350, clipBottom: 363, clipH: 242, floorPx: 125 })).on, false)
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 600, clipBottom: 613, clipH: 492, floorPx: 187.5 })).on, false)
  // 亚像素不转
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 185.4, clipBottom: 185, clipH: 64 })).on, false)
})

test("C1：量裁切外壳不量对话列——外壳底 185 与列底 201.5 结论不同", () => {
  const footerBottom = 199 // 卡在列内、但越过外壳裁切线
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom, clipBottom: 185, clipH: 64 })).on, true)
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom, clipBottom: 201.5, clipH: 80.5 })).on, false)
})

test("R2：转条过渡中外壳逐帧下降（205 → 197）→ 长回量取过渡完的 67，不按首帧 59 提前释放", () => {
  let s = nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 204, clipBottom: 179, clipH: 58, clusterPx: 264 }))
  for (const clusterPx of [205, 202.5, 199.9, 198.4, 197]) {
    s = nextTrayApprovalClip(s, m({ footerBottom: 241, clipBottom: 246, clipH: 125 + (205 - clusterPx), clusterPx, stripApplied: true }))
  }
  assert.equal(s.regrowPx, 67)
  // 真机 H=510（q0）：外壳 155、地板 88 → 67 < 75，保持（首帧 59 时会在这里放）
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 271, clipBottom: 276, clipH: 155, floorPx: 88, clusterPx: 197, stripApplied: true })).on, true)
  // H=521：外壳 166、地板 90.75 → 75.25 ≥ 75，放
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 282, clipBottom: 287, clipH: 166, floorPx: 90.75, clusterPx: 197, stripApplied: true })).on, false)
})

test("R2：长回量在转条后首帧开始量、只增不减（67），表单之后长高 20 仍为 67，不提前释放", () => {
  let s = enterQ2()
  s = nextTrayApprovalClip(s, m({ footerBottom: 247, clipBottom: 252, clipH: 131, clusterPx: 211, stripApplied: true }))
  assert.equal(s.regrowPx, 67)
  assert.equal(s.on, true)
  // 转条前（stripApplied=false）的帧不冻结
  const s1 = nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 208, clipBottom: 185, clipH: 64, clusterPx: 258 }))
  const s1b = nextTrayApprovalClip(s1, m({ footerBottom: 208, clipBottom: 185, clipH: 64, clusterPx: 258, stripApplied: false }))
  assert.equal(s1b.regrowPx, null)
})

test("leo ①：条带态内序列 205 → 201 → 197 → 长回量 67；之后打字簇变高 217 / 240，长回量不降", () => {
  let s = nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 204, clipBottom: 179, clipH: 58, clusterPx: 264 }))
  assert.equal(s.entryClusterPx, 264)
  const seen: Array<number | null> = []
  for (const clusterPx of [205, 201, 197]) {
    s = nextTrayApprovalClip(s, m({ footerBottom: 241, clipBottom: 246, clipH: 125, clusterPx, stripApplied: true }))
    seen.push(s.regrowPx)
  }
  assert.deepEqual(seen, [59, 63, 67])
  for (const clusterPx of [217, 240]) {
    s = nextTrayApprovalClip(s, m({ footerBottom: 241, clipBottom: 246, clipH: 125, clusterPx, stripApplied: true }))
    assert.equal(s.regrowPx, 67, `cluster ${clusterPx}`)
    assert.equal(s.on, true)
  }
})

test("leo ①：只增不减不跨轮——释放 / 审批消失 / 附件数变后都清零，下一次进入从首帧重新量", () => {
  const strip = (st: TrayApprovalClip, clusterPx: number, over: Partial<TrayApprovalClipInput> = {}) =>
    nextTrayApprovalClip(st, m({ footerBottom: 241, clipBottom: 246, clipH: 125, clusterPx, stripApplied: true, ...over }))
  const enter = (st: TrayApprovalClip, clusterPx = 264, over: Partial<TrayApprovalClipInput> = {}) =>
    nextTrayApprovalClip(st, m({ footerBottom: 204, clipBottom: 179, clipH: 58, clusterPx, ...over }))
  // 第一轮长回 67
  let s = strip(strip(enter(TRAY_APPROVAL_CLIP_OFF), 205), 197)
  assert.equal(s.regrowPx, 67)
  // (a) 几何释放 → regrow / entry 清空
  const released = nextTrayApprovalClip(s, m({ footerBottom: 300, clipBottom: 305, clipH: 309, floorPx: 125, clusterPx: 197, stripApplied: true }))
  assert.equal(released.on, false)
  assert.equal(released.regrowPx, null)
  assert.equal(released.entryClusterPx, null)
  // 下一次进入：入口簇 250，首帧 207 → 43（不是带过来的 67）
  let r = enter(released, 250)
  assert.equal(r.regrowPx, null)
  r = strip(r, 207)
  assert.equal(r.regrowPx, 43)
  // (b) 审批消失 → 全清
  const gone = nextTrayApprovalClip(s, m({ footerBottom: null, clipBottom: 246, clipH: 125 }))
  assert.deepEqual(gone, TRAY_APPROVAL_CLIP_OFF)
  assert.equal(strip(enter(gone, 250), 207).regrowPx, 43)
  // (c) 附件数变 → 当轮作废（regrowPx = null，不保留 67），只等审批消失；消失后再进入照常重新量
  s = strip(s, 197, { attachCount: 2 })
  assert.equal(s.regrowPx, null)
  assert.equal(s.regrowUnknown, true)
  s = strip(s, 150, { attachCount: 2 })
  assert.equal(s.regrowPx, null, "作废后不再按只增不减累积")
  // 审批消失：即使长回量偏大 / 未知也无条件释放
  const off = nextTrayApprovalClip({ ...s, regrowPx: 9999, regrowUnknown: false }, m({ footerBottom: null, clipBottom: 246, clipH: 125 }))
  assert.equal(off.on, false)
  assert.equal(strip(enter(off, 250, { attachCount: 2 }), 207, { attachCount: 2 }).regrowPx, 43)
})

test("R1：条带 q2 131/80.5、q0 125/80.5，长回 67 → 保持；不读「裁切线 − footer 底」", () => {
  const s = enterQ2()
  for (const clipH of [131, 125]) {
    for (const gap of [5, 13, 100]) {
      const n = nextTrayApprovalClip(s, m({ footerBottom: 252 - gap, clipBottom: 252, clipH, clusterPx: 191, stripApplied: true }))
      assert.equal(n.on, true, `clipH=${clipH} gap=${gap}`)
    }
  }
  // 释放线上：gap 改 5 / 13 / 100 结论都不变
  for (const gap of [5, 13, 100]) {
    const n = nextTrayApprovalClip(s, m({ footerBottom: 500 - gap, clipBottom: 500, clipH: 309, floorPx: 125, clusterPx: 191, stripApplied: true }))
    assert.equal(n.on, false, `gap=${gap}`)
  }
})

test("R1 / C2：拉宽到 1024（外壳 309、地板 125）→ 释放；同组数地板 80.5 vs 120.5 结论不同", () => {
  const s = enterQ2()
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 300, clipBottom: 305, clipH: 309, floorPx: 125, clusterPx: 191, stripApplied: true })).on, false)
  const at = (floorPx: number, clipH = 165) =>
    nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH, floorPx, clusterPx: 191, stripApplied: true })).on
  assert.equal(at(80.5), false) // 165 − 80.5 = 84.5 ≥ 75 → 放
  assert.equal(at(120.5), true) // 165 − 120.5 = 44.5 < 75 → 保持
  // 释放线 = 地板 + 长回 + 8
  assert.equal(at(200 - 67 - APPROVAL_CLIP_RELEASE_PX, 200), false)
  assert.equal(at(200 - 67 - APPROVAL_CLIP_RELEASE_PX + 0.5, 200), true)
})

test("R1 补：列内容需求（排队坞行模式）大于地板时按需求放，释放后不被裁回；需求小于地板时同 R1", () => {
  const s = enterQ2()
  // 真机 q2 坞两行：H=513 外壳 164、地板 88.75 → 只比地板会放（75.25 ≥ 75），放后外壳 97 < 需求 → 被裁回
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 280, clipBottom: 285, clipH: 164, floorPx: 88.75, clusterPx: 191, stripApplied: true })).on, false)
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 280, clipBottom: 285, clipH: 164, floorPx: 88.75, contentNeedPx: 118, clusterPx: 191, stripApplied: true })).on, true)
  // 需求 118 → 外壳 ≥ 118 + 67 + 8 = 193 才放
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 280, clipBottom: 285, clipH: 192.5, floorPx: 95, contentNeedPx: 118, clusterPx: 191, stripApplied: true })).on, true)
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 280, clipBottom: 285, clipH: 193, floorPx: 95, contentNeedPx: 118, clusterPx: 191, stripApplied: true })).on, false)
  // 需求 < 地板：与只看地板结论相同（q0 条带实测需求 83）
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 160, floorPx: 120.5, contentNeedPx: 83, clusterPx: 191, stripApplied: true })).on, true)
  // 需求 83 略大于地板 80.5：释放线 83 + 75 = 158
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 157.5, floorPx: 80.5, contentNeedPx: 83, clusterPx: 191, stripApplied: true })).on, true)
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 158, floorPx: 80.5, contentNeedPx: 83, clusterPx: 191, stripApplied: true })).on, false)
})

test("R3：地板 NaN → 不按几何释放，只等 footer 消失", () => {
  let s = enterQ2()
  s = nextTrayApprovalClip(s, m({ footerBottom: 300, clipBottom: 305, clipH: 900, floorPx: Number.NaN, clusterPx: 191, stripApplied: true }))
  assert.equal(s.on, true)
  s = nextTrayApprovalClip(s, m({ footerBottom: 300, clipBottom: 305, clipH: 900, floorPx: null, clusterPx: 191, stripApplied: true }))
  assert.equal(s.on, true)
  s = nextTrayApprovalClip(s, m({ footerBottom: null, clipBottom: 305, clipH: 900, floorPx: Number.NaN, clusterPx: 191 }))
  assert.deepEqual(s, TRAY_APPROVAL_CLIP_OFF)
})

test("R2 失效：附件数变化 → 长回量未知，只等 footer 消失；点「收起」/展开不改附件数、不作废", () => {
  let s = enterQ2()
  // 收起 / 再展开：附件数不变，长回量仍 67
  s = nextTrayApprovalClip(s, m({ footerBottom: 247, clipBottom: 252, clipH: 131, clusterPx: 191, stripApplied: true }))
  assert.equal(s.regrowPx, 67)
  s = nextTrayApprovalClip(s, m({ footerBottom: 247, clipBottom: 252, clipH: 131, clusterPx: 191, stripApplied: true, attachCount: 2 }))
  assert.equal(s.regrowUnknown, true)
  s = nextTrayApprovalClip(s, m({ footerBottom: 300, clipBottom: 305, clipH: 900, floorPx: 125, clusterPx: 191, stripApplied: true, attachCount: 2 }))
  assert.equal(s.on, true)
  s = nextTrayApprovalClip(s, m({ footerBottom: null, clipBottom: 305, clipH: 900, clusterPx: 191, attachCount: 2 }))
  assert.equal(s.on, false)
})

test("footer 为 null（批准 / 拒绝 / 停止）→ 立即 off 并清闩", () => {
  const s = { ...enterQ2(), blockedBelowPx: 131 }
  assert.deepEqual(nextTrayApprovalClip(s, m({ footerBottom: null, clipBottom: 252, clipH: 131 })), TRAY_APPROVAL_CLIP_OFF)
  assert.deepEqual(nextTrayApprovalClip(s, m({ footerBottom: 247, clipBottom: null, clipH: null })), TRAY_APPROVAL_CLIP_OFF)
})

test("英文 footer 折行（+24）→ 转条；条带外壳 131 放得下 footer 需求 87+24", () => {
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, m({ footerBottom: 208 + 24, clipBottom: 185, clipH: 64 })).on, true)
  const s = enterQ2()
  const n = nextTrayApprovalClip(s, m({ footerBottom: 247, clipBottom: 252, clipH: 131, clusterPx: 191, stripApplied: true }))
  assert.equal(n.on, true)
  assert.ok(131 >= 87 + 24)
})

/** luna §2 线性模型（q2）：容器 = H − 158，地板 = 0.25 × 容器；展开外壳 = H − 416，条带外壳 = 展开 + 67。 */
function frameAt(H: number, strip: boolean): TrayApprovalClipInput {
  const floorPx = 0.25 * (H - 158)
  const shell = H - 416 + (strip ? 67 : 0)
  const clipBottom = 121 + shell
  const footerBottom = shell >= floorPx ? clipBottom - 5 : clipBottom + (floorPx - shell) + 6.5
  return m({ footerBottom, clipBottom, clipH: shell, floorPx, clusterPx: strip ? 191 : 258, stripApplied: strip })
}

function sweep(heights: number[]): boolean[] {
  let s = TRAY_APPROVAL_CLIP_OFF
  const out: boolean[] = []
  for (const H of heights) {
    // 每个高度先按当前形态量一次，形态变了再按新形态量一次（模拟 RO 回调）
    for (let i = 0; i < 3; i++) s = nextTrayApprovalClip(s, frameAt(H, s.on))
    out.push(s.on)
  }
  return out
}

function flips(seq: boolean[]): number {
  let n = 0
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) n++
  return n
}

test("回滞：窗高 530→480→530 往返 3 次，每个方向只切一次；进 <502、放 ≥ 进入需求 + 长回 + 8（≥ 8px 死区）", () => {
  const down = Array.from({ length: 51 }, (_, i) => 530 - i)
  const up = Array.from({ length: 51 }, (_, i) => 480 + i)
  const seq = sweep([...down, ...up, ...down, ...up, ...down, ...up])
  assert.equal(flips(seq), 6)
  const one = sweep([...down, ...up])
  assert.equal(one[down.indexOf(501)], true)
  assert.equal(one[down.indexOf(502)], false)
  const releaseAt = up[one.slice(down.length).indexOf(false)]!
  assert.ok(releaseAt - 501 >= 8, `release ${releaseAt}`)
})

test("回滞：释放线 ±6 内来回 10 次 → 只变一次", () => {
  let s = enterQ2()
  const seq: boolean[] = [s.on]
  // 条带态释放线：clipH = 80.5 + 67 + 8 = 155.5
  for (let i = 0; i < 10; i++) {
    for (const clipH of [149.5, 161.5]) {
      const stripNow = s.on
      // 放掉后外壳少 67、footer 不再越线
      const h = stripNow ? clipH : clipH - 67
      const clipBottom = 121 + h
      const footerBottom = stripNow ? clipBottom - 5 : h >= 80.5 ? clipBottom - 5 : clipBottom + (80.5 - h)
      s = nextTrayApprovalClip(s, m({ footerBottom, clipBottom, clipH: h, clusterPx: stripNow ? 191 : 258, stripApplied: stripNow }))
      seq.push(s.on)
    }
  }
  assert.equal(flips(seq), 1)
})

test("R4 防抖闩：几何释放后同一外壳下又被裁 → 重进并闩住；外壳再长 ≥ 8 才允许再放；不出现 on/off/on/off", () => {
  let s = enterQ2()
  const seq: boolean[] = [s.on]
  // 外壳够高 → 几何释放
  s = nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 170, floorPx: 80.5, clusterPx: 191, stripApplied: true }))
  seq.push(s.on)
  assert.equal(s.on, false)
  assert.equal(s.releasedByGeometry, true)
  // 释放后 dock 内容自身需求大于地板：footer 仍越线 → 重进
  s = nextTrayApprovalClip(s, m({ footerBottom: 106, clipBottom: 103, clipH: 103, floorPx: 80.5, clusterPx: 258, stripApplied: false }))
  seq.push(s.on)
  assert.equal(s.on, true)
  assert.equal(s.latchPending, true)
  // 重进后条带首帧记闩 = 170
  for (let i = 0; i < 5; i++) {
    s = nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 170, floorPx: 80.5, clusterPx: 191, stripApplied: true }))
    seq.push(s.on)
  }
  assert.equal(s.blockedBelowPx, 170)
  assert.equal(s.on, true)
  // 需释放：外壳 ≥ 闩 170 + 8
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 177.5, clusterPx: 191, stripApplied: true })).on, true)
  assert.equal(nextTrayApprovalClip(s, m({ footerBottom: 160, clipBottom: 165, clipH: 178, clusterPx: 191, stripApplied: true })).on, false)
  assert.ok(flips(seq) <= 2, `seq=${seq.join(",")}`)
  // footer 消失清闩
  assert.deepEqual(nextTrayApprovalClip(s, m({ footerBottom: null, clipBottom: 165, clipH: 160 })), TRAY_APPROVAL_CLIP_OFF)
})

test("K12 交接：审批消失时按 K12 原式（盒 + 对话余量 ≥ 条带内容 + 长回 + 8）判一次——放得下立即放，放不下以 K12 态接手", () => {
  // 真机 733×480 q0 释放帧：条带内容 197、长回 67 → 整托盘 264；盒 197 + 对话余量 125 − 56 = 69 → 266 < 272 → 接手
  assert.deepEqual(squeezeHandoverOnRelease({ regrowPx: 67, contentPx: 197, boxPx: 197, conversationSlackPx: 69 }), { on: true, needPx: 264 })
  // 释放线：room = need + 8 → 放
  assert.equal(squeezeHandoverOnRelease({ regrowPx: 67, contentPx: 197, boxPx: 197, conversationSlackPx: 75 }), null)
  assert.deepEqual(squeezeHandoverOnRelease({ regrowPx: 67, contentPx: 197, boxPx: 197, conversationSlackPx: 74.5 }), { on: true, needPx: 264 })
  // 1024×670：对话余量 180 → 立即放（零变化）
  assert.equal(squeezeHandoverOnRelease({ regrowPx: 67, contentPx: 197, boxPx: 197, conversationSlackPx: 180 }), null)
  // 长回量未知（附件数变作废）→ 不接，交回 K12 自己判
  assert.equal(squeezeHandoverOnRelease({ regrowPx: null, contentPx: 197, boxPx: 197, conversationSlackPx: 0 }), null)
  // 负余量按 0
  assert.deepEqual(squeezeHandoverOnRelease({ regrowPx: 10, contentPx: 200, boxPx: 200, conversationSlackPx: -5 }), { on: true, needPx: 210 })
})

test("K12 交接后 needPx 只增不减跟上条带内容（审批走后晚一帧多一行 197 → 233）", () => {
  assert.equal(refreshHandoverNeed(264, 197, 67), 264)
  assert.equal(refreshHandoverNeed(264, 233, 67), 300)
  assert.equal(refreshHandoverNeed(300, 220, 67), 300)
  assert.equal(refreshHandoverNeed(null, 200, 67), 267)
})

test("条带已由 K12 / slot 画着时 footer 越线不进入（量不到转条前簇高；条带也帮不上）", () => {
  const input = m({ footerBottom: 208, clipBottom: 185, clipH: 64, clusterPx: 191, stripApplied: true, stripHeldElsewhere: true })
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, input), TRAY_APPROVAL_CLIP_OFF)
  // 自己已在条带态时这个标记不影响（hook 只在 clip 未 on 时置位）
  assert.equal(nextTrayApprovalClip(TRAY_APPROVAL_CLIP_OFF, { ...input, stripHeldElsewhere: false }).on, true)
})

test("三路 OR：slot 非 null 时这一路不参与（审批时 slot 恒为 null，仍写成断言）", () => {
  assert.equal(trayStripFromPaths({ slotStrip: false, slot: 120, squeezed: false, approvalClip: true }), false)
  assert.equal(trayStripFromPaths({ slotStrip: true, slot: 90, squeezed: false, approvalClip: false }), true)
  assert.equal(trayStripFromPaths({ slotStrip: false, slot: null, squeezed: false, approvalClip: true }), true)
  assert.equal(trayStripFromPaths({ slotStrip: false, slot: null, squeezed: true, approvalClip: false }), true)
  assert.equal(trayStripFromPaths({ slotStrip: false, slot: null, squeezed: false, approvalClip: false }), false)
})

test("C2 源码断言：判定纯函数与 hook 不复算 CSS 地板、不写死地板值", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  for (const file of ["composer-tray-approval-clip.ts", "use-composer-tray-budget.ts"]) {
    const src = readFileSync(join(dir, file), "utf8")
    for (const lit of ["cqh", "13rem", "80.5"]) assert.equal(src.includes(lit), false, `${file} 含 ${lit}`)
    assert.equal(/Math\.min\([^)]*0\.25/.test(src), false, `${file} 复算 min()`)
  }
})
