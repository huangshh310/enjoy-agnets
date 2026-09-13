/**
 * 验证配置抽屉用量与额度板块：包含官方额度仪表、本地消耗汇总、趋势 Sparkline 与外部账单链接。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhSettings } from "../../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../../i18n/catalogs/en/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("用量与额度板块组件包含完整的额度/消耗/趋势要素", () => {
  const src = readFileSync(join(dir, "agent-tool-usage-section.tsx"), "utf8")
  assert.ok(src.includes("SubscriptionQuotaMeter"), "应集成官方额度进度条")
  assert.ok(src.includes("UsageTrendSparkline"), "应集成30天走势折线图")
  assert.ok(src.includes("formatSpendLine"), "应集成消耗金额/Token明细")
  assert.ok(src.includes("RateLimitResetsCard"), "应支持速率重置凭据")
  assert.ok(src.includes("PROVIDER_LINKS"), "应支持官方控制台直达外链")
  assert.ok(src.includes("onViewDashboard"), "应支持一键跳转到订阅大盘")
})

test("动力源胶囊在呈现模型时带有 ModelBrandIcon 品牌矢量标", () => {
  const src = readFileSync(join(dir, "power-source/power-source-capsule.tsx"), "utf8")
  assert.ok(src.includes("ModelBrandIcon"), "动力源胶囊应引入 ModelBrandIcon")
  assert.ok(src.includes("<ModelBrandIcon modelId={parts.model}"), "模型文字前应渲染对应品牌图标")
})

test("中文与英文 settings catalog 均完整提供用量板块文案", () => {
  const zh = zhSettings.agentTools
  const en = enSettings.agentTools

  assert.equal(zh.usageSectionTitle, "用量与额度")
  assert.equal(en.usageSectionTitle, "Usage & Quota")

  assert.ok(zh.usageSectionDesc.length > 0)
  assert.ok(en.usageSectionDesc.length > 0)

  assert.ok(zh.usageNoLocalSpend.includes("尚未产生"))
  assert.ok(en.usageNoLocalSpend.includes("No local usage"))

  assert.ok(zh.powerOfficialDirect === "官方直连")
  assert.ok(en.powerOfficialDirect === "Official Direct")
  assert.ok(zh.powerNeedInstall === "需先安装")
  assert.ok(en.powerNeedInstall === "Install required")
})

test("抽屉正文组件正常引入并挂载用量板块", () => {
  const cliSrc = readFileSync(join(dir, "agent-tool-config-cli.tsx"), "utf8")
  assert.ok(cliSrc.includes("AgentToolUsageSection"), "CLI 抽屉应挂载用量板块")

  const localSrc = readFileSync(join(dir, "agent-tool-config-local.tsx"), "utf8")
  assert.ok(localSrc.includes("AgentToolUsageSection"), "本地助手抽屉应挂载用量板块")
})
