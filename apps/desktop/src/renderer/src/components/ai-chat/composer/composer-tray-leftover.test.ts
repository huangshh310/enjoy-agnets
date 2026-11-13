import assert from "node:assert/strict"
import { test } from "node:test"
import {
  EXPANDED_TRAY_COMFORT_PX,
  EXPANDED_TRAY_FLOOR_PX,
  EXPANDED_TRAY_KEEP_THUMB_PX,
  FORM_SLACK_PX,
  GALLERY_CONTENT_CAP_PX,
  TRAY_CHROME_TIGHT,
  TRAY_FORM_OVERLAP_PX,
  TRAY_THUMB_PX,
  capTrayHeight,
  galleryMaxHeightPx,
  leftoverAtNaturalFormHeight,
  preferredTrayBudget,
  shouldReclaimFormSlack,
  shouldTightenTrayChrome,
  statusBarBottomEdge,
  trayLeftoverPx
} from "./composer-tray-leftover.ts"

/** luna / measure-results.json @ 2bb02557，733×480 状态栏与待验收几何。 */
const VP = 480
const STATUS_TOP = 443
const STATUS_HEIGHT = 24
const STATUS_BOTTOM = 467
const TRAY_TOP_REVIEW = 219
const FORM_WRAPPED = 192
const FORM_NO_REVIEW = 212
const SEND_OFFSET = 11
const TRAY_TOP_NO_REVIEW_EXPANDED = 139

test("leftover 底边界用状态栏 top，不用视口高减栏高", () => {
  const edge = statusBarBottomEdge({ statusBarTop: STATUS_TOP, viewportHeight: VP })
  assert.equal(edge, STATUS_TOP)
  assert.notEqual(edge, VP - STATUS_HEIGHT)
  assert.equal(STATUS_BOTTOM, 467)
  assert.equal(VP - STATUS_HEIGHT, 456)
  assert.equal(456 - STATUS_TOP, 13)
  assert.equal(statusBarBottomEdge({ statusBarTop: null, viewportHeight: VP }), VP)
})

test("待验收 + 展开：form 192 时 leftover 低于最矮 64，须收余量", () => {
  const leftover = trayLeftoverPx({
    bottomEdge: STATUS_TOP,
    trayTop: TRAY_TOP_REVIEW,
    formHeight: FORM_WRAPPED,
    sendOffsetFromFormBottom: SEND_OFFSET,
    overlap: TRAY_FORM_OVERLAP_PX
  })
  assert.equal(leftover, 57)
  assert.ok(leftover < EXPANDED_TRAY_FLOOR_PX)
  assert.equal(shouldReclaimFormSlack(leftover), true)
})

test("错用视口高减栏高会得到 70，可能漏收余量且发送仍压进状态栏", () => {
  const wrongEdge = VP - STATUS_HEIGHT
  const leftover = trayLeftoverPx({
    bottomEdge: wrongEdge,
    trayTop: TRAY_TOP_REVIEW,
    formHeight: FORM_WRAPPED,
    sendOffsetFromFormBottom: SEND_OFFSET
  })
  assert.equal(leftover, 70)
  assert.ok(leftover >= EXPANDED_TRAY_FLOOR_PX)
  assert.equal(shouldReclaimFormSlack(leftover), false)
  const trayUsed = capTrayHeight(EXPANDED_TRAY_COMFORT_PX, leftover)
  assert.equal(trayUsed, 70)
  const formBottom = TRAY_TOP_REVIEW + 70 - TRAY_FORM_OVERLAP_PX + FORM_WRAPPED
  const sendBottom = formBottom - SEND_OFFSET
  assert.equal(formBottom, 467)
  assert.equal(sendBottom, 456)
  assert.ok(sendBottom > STATUS_TOP)
})

test("收回 34px 余量后 leftover 升到最矮以上，托盘可保住整颗缩略图", () => {
  assert.ok(FORM_SLACK_PX >= 20 && FORM_SLACK_PX <= 36)
  const leftoverNatural = 57
  const formAfter = FORM_WRAPPED - FORM_SLACK_PX
  assert.equal(formAfter, 158)
  assert.ok(formAfter >= 156 && formAfter <= 172)
  const leftover = leftoverNatural + FORM_SLACK_PX
  assert.equal(leftover, 91)
  assert.equal(shouldReclaimFormSlack(leftoverNatural), true)
  const budget = preferredTrayBudget(leftover)
  // 建议缝 83 会让画廊 43 < 44，让路给整颗缩略图，用硬底线 91。
  assert.equal(budget, leftover)
  assert.ok(budget >= EXPANDED_TRAY_KEEP_THUMB_PX)
  const trayUsed = capTrayHeight(EXPANDED_TRAY_COMFORT_PX, budget)
  assert.equal(trayUsed, 91)
  const formBottom = TRAY_TOP_REVIEW + 91 - TRAY_FORM_OVERLAP_PX + formAfter
  const sendBottom = formBottom - SEND_OFFSET
  assert.equal(formBottom, 454)
  assert.ok(formBottom <= VP)
  assert.ok(formBottom > STATUS_TOP)
  assert.ok(sendBottom <= STATUS_TOP)
  assert.equal(sendBottom, 443)
  const gallery = galleryMaxHeightPx({
    trayBudget: 91,
    titleBarHeight: 28,
    chrome: TRAY_CHROME_TIGHT
  })
  assert.ok(gallery >= TRAY_THUMB_PX)
  assert.ok(gallery <= GALLERY_CONTENT_CAP_PX)
})

test("已收余量时用自然表单 leftover 判断，避免开关振荡", () => {
  const current = leftoverAtNaturalFormHeight({
    leftoverWithCurrentForm: 91,
    slackApplied: true
  })
  assert.equal(current, 57)
  assert.equal(shouldReclaimFormSlack(current), true)
  const ample = leftoverAtNaturalFormHeight({
    leftoverWithCurrentForm: 200,
    slackApplied: true
  })
  assert.ok(ample >= EXPANDED_TRAY_FLOOR_PX)
  assert.equal(shouldReclaimFormSlack(ample), false)
})

test("待验收 + 紧凑：收余量后自然高 73 小于预算，不削托盘，发送离开状态栏", () => {
  const leftover = 57 + FORM_SLACK_PX
  const formAfter = FORM_WRAPPED - FORM_SLACK_PX
  const compactNatural = 73
  assert.equal(capTrayHeight(compactNatural, leftover), null)
  assert.equal(shouldTightenTrayChrome(null), false)
  const formBottom = TRAY_TOP_REVIEW + compactNatural - TRAY_FORM_OVERLAP_PX + formAfter
  const sendBottom = formBottom - SEND_OFFSET
  assert.equal(formBottom, 436)
  assert.ok(formBottom <= VP)
  assert.ok(sendBottom <= STATUS_TOP)
})

test("无验收仅展开：leftover 充足，不压托盘、不收余量", () => {
  const leftover = trayLeftoverPx({
    bottomEdge: STATUS_TOP,
    trayTop: TRAY_TOP_NO_REVIEW_EXPANDED,
    formHeight: FORM_NO_REVIEW,
    sendOffsetFromFormBottom: SEND_OFFSET
  })
  assert.equal(leftover, 117)
  assert.equal(shouldReclaimFormSlack(leftover), false)
  assert.equal(capTrayHeight(EXPANDED_TRAY_COMFORT_PX, leftover), null)
})

test("1440 密度：自然 108 小于大余量时不得封顶或收紧铬", () => {
  // 1440×920 真机：trayTop=613，form=156，发送已可点；状态栏顶至少在 send.bottom=852 之下。
  const leftover = trayLeftoverPx({
    bottomEdge: 880,
    trayTop: 613,
    formHeight: 156,
    sendOffsetFromFormBottom: 11
  })
  assert.ok(leftover > EXPANDED_TRAY_COMFORT_PX)
  assert.equal(capTrayHeight(EXPANDED_TRAY_COMFORT_PX, leftover), null)
  assert.equal(shouldTightenTrayChrome(null), false)
  // 未封顶时沿用现网 max-h-48，不把 leftover 函数的可用画廊高当成 1440 的新上限。
})

test("建议缝在保不住整颗缩略图时退回硬底线", () => {
  // 紧铬 + 标题 28 + 44 图 = 84。80 不够建议缝，也低于 84，退回 80。
  assert.equal(preferredTrayBudget(80), 80)
  // 90 的建议缝 82 仍低于 84，退回 90 以保住缩略图。
  assert.equal(preferredTrayBudget(90), 90)
  // 100 的建议缝 92 ≥ 84 且 ≥ 76，可采用。
  assert.equal(preferredTrayBudget(100), 92)
  assert.equal(shouldTightenTrayChrome(91), true)
  assert.equal(shouldTightenTrayChrome(108), false)
})
