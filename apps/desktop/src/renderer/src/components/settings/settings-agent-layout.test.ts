/**
 * 本机 CLI 必须先管理台后说明书，避免再把矩阵顶到卡片前面。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

test("本机 CLI 页顺序是顶栏 → 审批摘要 → 列表 → 能力说明", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "settings-agent.tsx"), "utf8")
  const hub = src.indexOf("<AgentToolsCommandHub")
  const strip = src.indexOf('<ApprovalDiscoverStrip origin="racks"')
  const page = src.indexOf("<AgentToolsPage")
  const docs = src.indexOf("<AgentCapabilityDocs")
  assert.ok(hub >= 0 && strip >= 0 && page >= 0 && docs >= 0)
  assert.ok(hub < strip && strip < page && page < docs)
})

test("默认项页顶是同一条审批摘要，不另开第二套审批面", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "settings-agent.tsx"), "utf8")
  const strip = src.indexOf('<ApprovalDiscoverStrip origin="defaults"')
  const defaults = src.indexOf("<SettingsDefaults")
  assert.ok(strip >= 0 && defaults >= 0 && strip < defaults)
  assert.ok(!src.includes("ApprovalPolicyMenu"))
  assert.ok(!src.includes("SettingsPermissions"))
})

test("自定义 ACP 编辑是右侧抽屉，不是居中 Dialog", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/custom-acp-agent-dialog.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SettingsSideDrawer"))
  assert.ok(!src.includes("DialogContent"))
})

test("智能体配置是右侧抽屉，不是居中 Dialog", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const drawer = readFileSync(join(dir, "agent-tools/agent-tool-config-drawer.tsx"), "utf8")
  assert.ok(drawer.includes("SettingsSideDrawer"))
  assert.ok(!drawer.includes("DialogContent"))
})

test("供应商添加/编辑是右侧抽屉，不是居中 Dialog", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "providers/provider-editor-drawer.tsx"),
    "utf8"
  )
  assert.ok(src.includes("SettingsSideDrawer"))
  assert.ok(!src.includes("DialogContent"))
})

test("凭证是可筛选下拉，不是电台列表", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/agent-tool-source-menu.tsx"),
    "utf8"
  )
  assert.ok(src.includes("AgentToolSourceMenu"))
  assert.ok(src.includes("BIND_SEARCH_AFTER"))
  assert.ok(!src.includes("ChoiceShell"))
})

test("绑定下拉只列官方登录和档案，添加在菜单外跳转供应商页", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "agent-tools")
  const menu = readFileSync(join(dir, "agent-tool-source-menu.tsx"), "utf8")
  const rows = readFileSync(join(dir, "bind-source/source-menu-rows.tsx"), "utf8")
  const slot = readFileSync(join(dir, "agent-tool-provider.tsx"), "utf8")
  const link = readFileSync(join(dir, "agent-tool-add-archive-link.tsx"), "utf8")
  assert.ok(!menu.includes("RiAddLine"))
  assert.ok(!menu.includes("AddProviderRow"))
  assert.ok(!menu.includes("goProviders"))
  assert.ok(!menu.includes("onAdd"))
  assert.ok(!rows.includes("AddProviderRow"))
  assert.ok(!rows.includes("goProviders"))
  assert.ok(!slot.includes("AgentToolNeedProvider"))
  assert.ok(!slot.includes("useAgentProviderCreate"))
  assert.ok(slot.includes("AgentToolAddArchiveLink"))
  assert.ok(link.includes('section: "providers"'))
  assert.ok(link.includes("addArchiveLink"))
})

test("这个助手用在官方账号区之前，绑了档案不得把 inspect 当英雄", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "agent-tools")
  const cli = readFileSync(join(dir, "agent-tool-config-cli.tsx"), "utf8")
  const panel = readFileSync(join(dir, "agent-tool-account-panel.tsx"), "utf8")
  const trust = cli.indexOf("<DrawerTrustStrip")
  const slot = cli.indexOf("<AgentToolPowerSlot")
  const account = cli.indexOf("<AgentToolAccountPanel")
  assert.ok(trust >= 0 && slot >= 0 && account >= 0 && trust < slot && slot < account)
  assert.ok(panel.includes("officialAccountRole"))
  assert.ok(panel.includes("AgentToolAccountAside"))
  const aside = readFileSync(join(dir, "agent-tool-account-aside.tsx"), "utf8")
  assert.ok(!aside.includes("accountCurrentModel"))
  assert.ok(!aside.includes("quotaInfo"))
})

test("本机 CLI 是同构表行，不是不等卡片网格", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/agent-tools-page.tsx"),
    "utf8"
  )
  assert.ok(src.includes("colPower"))
  assert.ok(src.includes("AgentToolRow"))
  assert.ok(src.includes("CLI_LIST_GRID"))
  assert.ok(!src.includes("md:grid-cols-2"))
  assert.ok(!src.includes("AgentToolCard"))
  assert.ok(!src.includes("listBanHint"))
})

test("配置抽屉对齐预览：576 宽、紧内边距、顶栏关", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "agent-tools")
  const drawer = readFileSync(join(dir, "agent-tool-config-drawer.tsx"), "utf8")
  const chrome = readFileSync(join(dir, "agent-tool-config-dialog-chrome.tsx"), "utf8")
  const constants = readFileSync(join(dir, "agent-tool-constants.ts"), "utf8")
  assert.ok(drawer.includes("AGENT_CONFIG_DRAWER_WIDTH_CLASS"))
  assert.ok(constants.includes("w-[min(36rem,calc(100vw-1.5rem))]"))
  assert.ok(drawer.includes("px-4 py-4"))
  assert.ok(chrome.includes("settings.agentTools.close"))
  assert.ok(!chrome.includes("makeActive"))
  assert.ok(!chrome.includes("AgentBrandIcon"))
})

test("这个助手用是标签+双行，档案触发器不夹模型 id", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "agent-tools")
  const provider = readFileSync(join(dir, "agent-tool-provider.tsx"), "utf8")
  const menu = readFileSync(join(dir, "agent-tool-source-menu.tsx"), "utf8")
  const bind = readFileSync(join(dir, "agent-tool-provider-bind.tsx"), "utf8")
  assert.ok(provider.includes("bindAccountLabel"))
  assert.ok(provider.includes("providerModeHint"))
  assert.ok(bind.includes("bindModelLabel"))
  assert.ok(menu.includes("archiveSubtitle"))
  assert.ok(!menu.includes("selectedModel || bound.modelId"))
  assert.ok(!menu.includes(" · {profile.modelId}"))
})

test("也用于是圆片，同步是带边框 details", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/agent-tool-provider-bind.tsx"),
    "utf8"
  )
  assert.ok(src.includes("rounded-full"))
  assert.ok(src.includes("<details"))
  assert.ok(src.includes("syncToggle"))
})

test("仅官方决策槽没有 Enjoy vault 下拉", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "agent-tools/power-source/official-power-slot.tsx"),
    "utf8"
  )
  assert.ok(src.includes("officialNoVaultHint"))
  assert.ok(!src.includes("AgentToolSourceMenu"))
  assert.ok(!src.includes("useCustomProvider"))
  assert.ok(!src.includes("AgentToolAddArchiveLink"))
  assert.ok(!src.includes("addArchiveLink"))
})
