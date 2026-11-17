import assert from "node:assert/strict"
import test from "node:test"
import { nextTraySqueeze, TRAY_SQUEEZE_OFF, TRAY_SQUEEZE_RELEASE_PX } from "./composer-tray-squeeze.ts"

test("#228 ④ 托盘挤压兜底：内容高 > 盒高才转单行条；放得下 / 亚像素不转", () => {
  assert.deepEqual(nextTraySqueeze(TRAY_SQUEEZE_OFF, { contentPx: 280, boxPx: 264, conversationSlackPx: 0 }), { on: true, needPx: 280 })
  assert.equal(nextTraySqueeze(TRAY_SQUEEZE_OFF, { contentPx: 264.4, boxPx: 264, conversationSlackPx: 0 }), TRAY_SQUEEZE_OFF)
  assert.equal(nextTraySqueeze(TRAY_SQUEEZE_OFF, { contentPx: 240, boxPx: 240, conversationSlackPx: 80 }), TRAY_SQUEEZE_OFF)
})

test("#228 ④ 托盘挤压兜底：释放要可用高度（盒高 + 对话区高出保底）≥ 进入时整托盘内容高 + 8，不在交界来回跳", () => {
  const on = { on: true, needPx: 280 }
  // 单行条后外壳内容只剩 ~209，盒高跟着内容；对话区多出来的高度算进可用里
  assert.equal(nextTraySqueeze(on, { contentPx: 209, boxPx: 209, conversationSlackPx: 55 }), on)
  assert.equal(nextTraySqueeze(on, { contentPx: 209, boxPx: 209, conversationSlackPx: 78 }), on)
  assert.deepEqual(nextTraySqueeze(on, { contentPx: 209, boxPx: 209, conversationSlackPx: 280 + TRAY_SQUEEZE_RELEASE_PX - 209 }), TRAY_SQUEEZE_OFF)
  // 释放后整托盘刚好放得下（内容 = 盒高）→ 不再转回
  assert.equal(nextTraySqueeze(TRAY_SQUEEZE_OFF, { contentPx: 280, boxPx: 280, conversationSlackPx: 8 }), TRAY_SQUEEZE_OFF)
})
