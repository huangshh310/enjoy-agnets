/**
 * P2 Remote soft：锁死文案在场；禁露开关/假成功/工程卖点。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { en } from "../../../i18n/catalogs/en/index.ts"

test("zh remoteSoft 锁死文案齐", () => {
  const s = zh.settings.remoteSoft
  assert.equal(s.title, "本机跑、异地控")
  assert.equal(
    s.lead,
    "工作与凭证仍在你的机器上。另一台桌面或浏览器只是遥控器——本机 Enjoy 须在线，关掉电脑就控不了。"
  )
  assert.equal(s.boundaryOnline, "本机 Enjoy 须在线 · 不对标「电脑关着也能遥控」")
  assert.equal(s.boundaryNoMobile, "无手机 App 第一波")
  assert.ok(s.boundaryTrend.includes("不承诺自建隧道"))
  assert.ok(s.boundaryTrend.includes("不对标商业 Connect"))
  assert.ok(s.boundaryNotSsh.includes("P0-R SSH"))
  assert.ok(s.trendAside.includes("本波不承诺自建隧道"))
  assert.ok(s.footnote.includes("不宣称已交付遥控产品"))
  assert.equal(s.collapsedSummary, "本机跑、异地控 · 了解边界")
  assert.equal(s.collapse, "收起")
  assert.equal(s.expand, "展开")
})

test("zh/en remoteSoft 禁露假承诺与开关卖点", () => {
  const blobs = [
    JSON.stringify(zh.settings.remoteSoft),
    JSON.stringify(en.settings.remoteSoft),
    JSON.stringify(zh.settings.about),
    JSON.stringify(en.settings.about)
  ].join("\n")
  for (const banned of [
    "启用异地控",
    "已可异地控",
    "不再显示",
    "Tailscale",
    "pairing 码",
    "Enable remote",
    "Already available remotely",
    "#210 = Remote",
    "Remote 已交付"
  ]) {
    assert.equal(blobs.includes(banned), false, `banned: ${banned}`)
  }
})

test("nav.about 为关于 Enjoy / About Enjoy", () => {
  assert.equal(zh.nav.about, "关于 Enjoy")
  assert.equal(en.nav.about, "About Enjoy")
})
