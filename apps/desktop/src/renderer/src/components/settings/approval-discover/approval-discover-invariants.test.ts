/**
 * P0-D：发现条只做摘要+跳转；密表不加列；C 端禁协议词。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { lookup } from "../../../i18n/lookup.ts"
import { en } from "../../../i18n/catalogs/en/index.ts"
import { zh } from "../../../i18n/catalogs/zh/index.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const settingsDir = join(dir, "..")

const copyKeys = [
  "settings.approvalDiscover.title",
  "settings.approvalDiscover.manage",
  "settings.approvalDiscover.back",
  "settings.approvalDiscover.summaryDefault",
  "settings.approvalDiscover.summaryPartial",
  "settings.approvalDiscover.summaryYolo"
] as const

const bannedCopy = [
  "权限协议",
  "令牌绑定",
  "requireWrite",
  "allow-reads",
  "allow-all",
  "allow_session",
  "本会话白名单",
  "YOLO",
  "自动放行全部",
  "编辑审批",
  "打开确认卡",
  "HMAC",
  "permissionMode",
  "Kanban",
  "worktree"
]

function readSettings(name: string): string {
  return readFileSync(join(settingsDir, name), "utf8")
}

test("中英发现性文案与预览锁一致，且不含协议词", () => {
  assert.equal(lookup(zh, "settings.approvalDiscover.title"), "审批策略")
  assert.equal(lookup(zh, "settings.approvalDiscover.manage"), "管理审批策略 →")
  assert.equal(lookup(zh, "settings.approvalDiscover.back"), "← 返回智能体设置")
  assert.equal(lookup(zh, "settings.approvalDiscover.summaryDefault"), "每次写盘与命令都需确认")
  assert.equal(lookup(zh, "settings.approvalDiscover.summaryPartial"), "本会话已放行部分操作 · 其余仍确认")
  assert.equal(lookup(zh, "settings.approvalDiscover.summaryYolo"), "自动批准已开启 · 请谨慎")
  assert.equal(lookup(en, "settings.approvalDiscover.title"), "Approval policy")
  assert.equal(lookup(en, "settings.approvalDiscover.manage"), "Manage approval policy →")
  assert.equal(lookup(en, "settings.approvalDiscover.back"), "← Back to agent settings")
  for (const key of copyKeys) {
    const zhText = lookup(zh, key)
    const enText = lookup(en, key)
    for (const token of bannedCopy) {
      assert.ok(!zhText.includes(token), `zh ${key} has ${token}`)
      assert.ok(!enText.includes(token), `en ${key} has ${token}`)
    }
  }
})

test("本机 CLI / 默认项挂同一条，Registry / 沙箱不挂", () => {
  const agent = readSettings("settings-agent.tsx")
  const hub = agent.indexOf("<AgentToolsCommandHub")
  const stripRacks = agent.indexOf('<ApprovalDiscoverStrip origin="racks"')
  const page = agent.indexOf("<AgentToolsPage")
  const docs = agent.indexOf("<AgentCapabilityDocs")
  const stripDefaults = agent.indexOf('<ApprovalDiscoverStrip origin="defaults"')
  const defaults = agent.indexOf("<SettingsDefaults")
  assert.ok(hub >= 0 && stripRacks >= 0 && page >= 0 && docs >= 0)
  assert.ok(hub < stripRacks && stripRacks < page && page < docs)
  assert.ok(stripDefaults >= 0 && defaults >= 0 && stripDefaults < defaults)
  assert.equal(agent.includes("<AcpRegistryPage"), true)
  assert.doesNotMatch(agent.slice(agent.indexOf("activeTab === \"registry\""), agent.indexOf("activeTab === \"harness\"")), /ApprovalDiscoverStrip/)
})

test("发现条只跳通用权限卡，不嵌第二套开关", () => {
  const strip = readFileSync(join(dir, "approval-discover-strip.tsx"), "utf8")
  assert.ok(strip.includes('section: "general"'))
  assert.ok(strip.includes("approvalDiscoverSearch"))
  assert.ok(!strip.includes("ApprovalPolicyMenu"))
  assert.ok(!strip.includes("SettingsPermissions"))
  assert.ok(!strip.includes("<Switch"))
  assert.ok(!strip.includes("allow_session"))
})

test("返回链回智能体，落点是已有权限卡 id", () => {
  const ret = readFileSync(join(dir, "approval-discover-return.tsx"), "utf8")
  const general = readSettings("settings-general.tsx")
  const permissions = readSettings("settings-permissions.tsx")
  assert.ok(ret.includes('section: "agent"'))
  assert.ok(ret.includes("agentReturnSearch"))
  assert.ok(general.includes("ApprovalDiscoverReturn"))
  assert.ok(general.includes("APPROVAL_PERMISSIONS_ANCHOR"))
  assert.ok(permissions.includes("APPROVAL_PERMISSIONS_ANCHOR"))
})

test("密表仍是三列，不按助手分行审批", () => {
  const table = readSettings("agent-tools/agent-tools-page.tsx")
  assert.ok(table.includes("colAssistant"))
  assert.ok(table.includes("colPower"))
  assert.ok(table.includes("colActions"))
  assert.ok(!table.includes("colApproval"))
  assert.ok(!table.includes("ApprovalDiscoverStrip"))
})
