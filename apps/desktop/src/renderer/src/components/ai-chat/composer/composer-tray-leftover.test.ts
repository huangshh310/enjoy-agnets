import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  CONVERSATION_FLOOR_PX,
  EXPANDED_TRAY_COMFORT_PX,
  FORM_SLACK_PX,
  FRAME_TRAY_GAP_PX,
  SEND_STATUS_GAP_PX,
  TRAY_STRIP_MAX_PX,
  TRAY_STRIP_MIN_PX,
  TRAY_THUMB_MIN_PX,
  TRAY_THUMB_PX,
  frameBottomAtConversationFloor,
  reclaimedFormHeight,
  sendBottomBudget,
  shouldUseTrayStrip,
  statusBarBottomEdge,
  trayStripSlot
} from "./composer-tray-leftover.ts"

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(join(here, rel), "utf8")

/** 真机几何：luna baseline @2bb02557 与 mike selfgate @bc0f2107 measure-results.json，733×480。 */
const VP = 480
const STATUS_TOP = 443
const STATUS_HEIGHT = 24
const FORM_WRAPPED = 192 // 733 待验收窄宽换行表单自然高
const FORM_RECLAIMED = 162 // 收回 30 后
const FRAME_BOTTOM_EXPANDED = 209 // 对话区 56（保底）时验收框底
const FRAME_BOTTOM_COMPACT = 224 // 紧凑态对话区 71
const CONV_EXPANDED = 56
const CONV_COMPACT = 71

test("底边界用状态栏 top，不用视口高减栏高；发送预算 = top − 13 = 430", () => {
  const edge = statusBarBottomEdge({ statusBarTop: STATUS_TOP, viewportHeight: VP })
  assert.equal(edge, STATUS_TOP)
  assert.notEqual(edge, VP - STATUS_HEIGHT)
  assert.equal(statusBarBottomEdge({ statusBarTop: null, viewportHeight: VP }), VP)
  assert.equal(SEND_STATUS_GAP_PX, 13)
  assert.equal(sendBottomBudget(STATUS_TOP), 430)
  assert.equal(sendBottomBudget(STATUS_TOP), Math.min(STATUS_TOP - 13, 430))
})

test("表单收回余量 30：192 → 162，form.y = 435 − 162 = 273 落在锁 266–275（展开）/ 266–277（紧凑）", () => {
  assert.equal(FORM_SLACK_PX, 30)
  assert.equal(reclaimedFormHeight({ formHeight: FORM_WRAPPED, slackApplied: false }), FORM_RECLAIMED)
  assert.equal(reclaimedFormHeight({ formHeight: FORM_RECLAIMED, slackApplied: true }), FORM_RECLAIMED)
  const formBottom = STATUS_TOP - 8 // Composer 外层 pb-2
  const formY = formBottom - FORM_RECLAIMED
  assert.equal(formY, 273)
  assert.ok(formY >= 266 && formY <= 275)
  // bc0f2107 form.bottom − send.bottom = 5 → send.bottom 430，margin 13
  assert.equal(formBottom - 5, 430)
  assert.equal(STATUS_TOP - (formBottom - 5), 13)
})

test("验收框底按对话区保底折算：展开 209 / 紧凑 224−(71−56)=209 / 单行条 210−1=209", () => {
  assert.equal(CONVERSATION_FLOOR_PX, 56)
  assert.equal(
    frameBottomAtConversationFloor({ frameBottom: FRAME_BOTTOM_EXPANDED, conversationHeight: CONV_EXPANDED, conversationFloor: 56 }),
    209
  )
  assert.equal(
    frameBottomAtConversationFloor({ frameBottom: FRAME_BOTTOM_COMPACT, conversationHeight: CONV_COMPACT, conversationFloor: 56 }),
    209
  )
  assert.equal(frameBottomAtConversationFloor({ frameBottom: 210, conversationHeight: 57, conversationFloor: Number.NaN }), 209)
  assert.equal(frameBottomAtConversationFloor({ frameBottom: 300, conversationHeight: null }), 300)
})

test("733×480 待验收：slot = (430 − 162) − (209 + 8) = 51 < 108 → 单行条；展开 / 紧凑 / 已转条三态同值", () => {
  const expanded = trayStripSlot({
    statusBarTop: STATUS_TOP,
    viewportHeight: VP,
    formHeight: FORM_WRAPPED,
    slackApplied: false,
    frameBottom: FRAME_BOTTOM_EXPANDED,
    conversationHeight: CONV_EXPANDED,
    conversationFloor: 56
  })
  const compact = trayStripSlot({
    statusBarTop: STATUS_TOP,
    viewportHeight: VP,
    formHeight: FORM_WRAPPED,
    slackApplied: false,
    frameBottom: FRAME_BOTTOM_COMPACT,
    conversationHeight: CONV_COMPACT,
    conversationFloor: 56
  })
  const inStrip = trayStripSlot({
    statusBarTop: STATUS_TOP,
    viewportHeight: VP,
    formHeight: FORM_RECLAIMED,
    slackApplied: true,
    frameBottom: 210,
    conversationHeight: 57,
    conversationFloor: 56
  })
  assert.equal(FRAME_TRAY_GAP_PX, 8)
  assert.equal(expanded, 51)
  assert.equal(compact, 51)
  assert.equal(inStrip, 51)
  assert.equal(shouldUseTrayStrip(expanded), true)
  assert.equal(shouldUseTrayStrip(inStrip), true)
})

test("733×480 无验收：没有验收框 → slot=null，不转单行条（form.bottom 445 / tray 108 零回退）", () => {
  const slot = trayStripSlot({
    statusBarTop: STATUS_TOP,
    viewportHeight: VP,
    formHeight: 212,
    slackApplied: false,
    frameBottom: null,
    conversationHeight: 56,
    conversationFloor: 56
  })
  assert.equal(slot, null)
  assert.equal(shouldUseTrayStrip(slot), false)
})

test("1440×920 待验收展开：slot ≥ 108，不转单行条（托盘 108 零变化）", () => {
  // selfgate @bc0f2107：状态栏 871，form 156，验收框底 595，对话区 440
  const slot = trayStripSlot({
    statusBarTop: 871,
    viewportHeight: 920,
    formHeight: 156,
    slackApplied: false,
    frameBottom: 595,
    conversationHeight: 440,
    conversationFloor: 56
  })
  assert.equal(slot, 858 - 126 - (211 + 8))
  assert.ok((slot ?? 0) >= EXPANDED_TRAY_COMFORT_PX)
  assert.equal(shouldUseTrayStrip(slot), false)
})

test("阈值：slot 恰为 108 不触发，107 触发；null / NaN 不触发", () => {
  assert.equal(EXPANDED_TRAY_COMFORT_PX, 108)
  assert.equal(shouldUseTrayStrip(108), false)
  assert.equal(shouldUseTrayStrip(107), true)
  assert.equal(shouldUseTrayStrip(null), false)
  assert.equal(shouldUseTrayStrip(Number.NaN), false)
})

test("单行条像素锁：毛高 52–56，缩略图 44（禁 <36）；1 + 4 + 44 + 4 = 53", () => {
  assert.equal(TRAY_THUMB_PX, 44)
  assert.ok(TRAY_THUMB_PX >= TRAY_THUMB_MIN_PX)
  assert.equal(TRAY_STRIP_MIN_PX, 52)
  assert.equal(TRAY_STRIP_MAX_PX, 56)
  const strip = 1 + 4 + TRAY_THUMB_PX + 4
  assert.ok(strip >= TRAY_STRIP_MIN_PX && strip <= TRAY_STRIP_MAX_PX)
  // 托盘顶 = 验收框底 + 10（mb-1 + 间隙），底 = form.y：209 + 10 + 53 = 272 ≤ 273
  assert.ok(209 + 10 + strip <= 435 - FORM_RECLAIMED)
})

test("托盘源码：单行条 mb-0、舒适态保留 -mb-3.5；不用 max-height 媒体查询当开关", () => {
  const src = read("../composer-queue.tsx")
  assert.match(src, /strip \? "mb-0" : "-mb-3\.5"/)
  assert.match(src, /strip \? "pt-1 pb-1" : "pt-2 pb-4"/)
  assert.match(src, /max-h-48/)
  assert.doesNotMatch(src, /max-height:\s*560/)
  assert.doesNotMatch(read("./use-composer-tray-budget.ts"), /matchMedia\(|innerHeight\s*[<>]/)
  // 收起入口在单行条展开态仍可见
  assert.match(src, /showAll \?/)
  assert.match(src, /t\("chat\.collapseQueue"\)/)
})

test("表单余量只在单行条时收：发送 32×32 不动，底栏 pb-2", () => {
  const footer = read("./composer-footer.tsx")
  assert.match(footer, /compactVerticalSlack && "gap-y-0\.5 pt-0 pb-2"/)
  const composer = read("../ai-chat-composer.tsx")
  assert.match(composer, /trayBudget\.reclaimSlack \? \{ "data-composer-tray-slack": "" \}/)
})

test("缩略图删除钮平时不吃命中：四角内收 5px 命中 IMG，悬停芯片才可点", () => {
  const chip = read("../composer-queue-items.tsx")
  assert.match(chip, /pointer-events-none opacity-0 [^"]*group-hover:pointer-events-auto group-hover:opacity-100/)
})
