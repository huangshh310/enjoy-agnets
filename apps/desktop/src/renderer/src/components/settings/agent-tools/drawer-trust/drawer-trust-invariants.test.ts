/**
 * P0-B 视觉锁：抽屉信任卡文案与预览同文；列表仍无额度条 / 体检句。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-b-drawer-trust.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("p0-b-drawer-trust.html 必须在仓内（PR #27 / f48ab0d）")
}

const preview = readPreviewHtml()
const listFiles = [
  "../agent-tool-row.tsx",
  "../agent-tool-row-parts.tsx",
  "../agent-tool-row-assistant.tsx",
  "../agent-tool-row-actions.tsx",
  "../list-secondary.ts",
  "../list-layout.ts"
]

test("预览真源仍在仓内，且四态 + 本月用量样例在", () => {
  assert.ok(preview.includes("【视觉真源】P0-B"))
  assert.ok(preview.includes("体检通过 · 3 分钟前"))
  assert.ok(preview.includes("体检失败 · 握手超时，PATH 上找不到二进制"))
  assert.ok(preview.includes("尚未体检"))
  assert.ok(preview.includes("检测中…"))
  assert.ok(preview.includes("运行体检"))
  assert.ok(preview.includes("本月用量 53% · 重置 9/30"))
  assert.ok(preview.includes("查看详情"))
  assert.ok(preview.includes("该助手无公开额度"))
  assert.ok(!preview.includes("progressbar"))
})

test("中文词表与预览同文，不用医生 / 额度 API 行话", () => {
  const tools = zhSettings.agentTools
  assert.equal(tools.trustHealth, "健康")
  assert.equal(tools.trustUsage, "用量")
  assert.equal(tools.trustDoctorPass, "体检通过")
  assert.equal(tools.trustDoctorFail, "体检失败")
  assert.equal(tools.trustDoctorIdle, "尚未体检")
  assert.equal(tools.trustDoctorChecking, "检测中…")
  assert.equal(tools.trustRunDoctor, "运行体检")
  assert.equal(tools.trustUsageMonth, "本月用量 {percent}%")
  assert.equal(tools.trustUsageReset, "重置 {date}")
  assert.equal(tools.trustUsageNone, "该助手无公开额度")
  assert.equal(tools.trustUsageDetail, "查看详情")
  assert.equal(tools.trustMinutesAgo, "{n} 分钟前")
  assert.equal(tools.trustDoctorFailTimeoutMissing, "握手超时，PATH 上找不到二进制")
  assert.notEqual(tools.trustRunDoctor, "连通性测试")
  assert.notEqual(tools.trustDoctorPass, "ACP 握手正常")
  assert.notEqual(tools.trustUsageNone, "该 CLI 无公开额度 API")
})

test("英文词表不用 Run doctor / quota API / handshake ok", () => {
  const tools = enSettings.agentTools
  assert.equal(tools.trustRunDoctor, "Run check")
  assert.equal(tools.trustDoctorIdle, "Not checked yet")
  assert.equal(tools.trustUsageNone, "This assistant has no public quota")
  assert.doesNotMatch(tools.trustRunDoctor, /doctor/i)
  assert.doesNotMatch(tools.trustDoctorPass, /ACP|handshake/i)
  assert.doesNotMatch(tools.trustUsageNone, /API/i)
})

test("抽屉正文信任卡在「这个助手用」之前，底部不再堆 doctor 条", () => {
  const cli = readFileSync(join(dir, "../agent-tool-config-cli.tsx"), "utf8")
  const ops = readFileSync(join(dir, "../agent-tool-config-ops.tsx"), "utf8")
  const strip = readFileSync(join(dir, "drawer-trust-strip.tsx"), "utf8")
  const trust = cli.indexOf("<DrawerTrustStrip")
  const slot = cli.indexOf("<AgentToolPowerSlot")
  assert.ok(trust >= 0 && slot >= 0 && trust < slot)
  assert.ok(strip.includes("trustHealth"))
  assert.ok(strip.includes("trustUsage"))
  assert.ok(!strip.includes("role=\"progressbar\""))
  assert.ok(!strip.includes("barWidth"))
  assert.ok(!ops.includes("DoctorButton"))
  assert.ok(!ops.includes("DoctorBanner"))
  assert.ok(!ops.includes("doctorRun"))
})

test("列表密表仍无本月用量 / 体检句 / 额度条", () => {
  for (const name of listFiles) {
    const src = readFileSync(join(dir, name), "utf8")
    assert.ok(!src.includes("本月用量"), `${name} leaked monthly usage onto the list`)
    assert.ok(!src.includes("体检通过"), `${name} leaked doctor pass onto the list`)
    assert.ok(!src.includes("DrawerTrustStrip"), `${name} imported drawer trust`)
    assert.ok(!src.includes("role=\"progressbar\""), `${name} drew a usage bar`)
  }
})
